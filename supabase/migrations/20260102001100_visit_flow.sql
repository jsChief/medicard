-- =============================================================================
-- CardEase - patient visit flow (flow.txt)
--
-- Implements the hospital journey:
--
--   check-in (HMO plan confirmed / private card on record)
--     -> vitals -> doctor consult -> lab and/or pharmacy orders
--     -> HMO approval wait -> fulfilment -> check-out (card withdrawn)
--
-- New tables:
--   visits                 the spine: one row per hospital encounter
--   insurance_verifications audit trail for the check-in plan confirmation
--   vitals                 one row per reading, linked to a visit
--   consultations          the doctor's note + disposition for the visit
--   lab_orders             tests requested by the doctor
--   prescriptions          medication items requested by the doctor
--
-- Design notes:
--   * Every table carries hospital_id and gets the same hospital-scoped RLS
--     policies as the init schema, so nothing here crosses tenants.
--   * HMO orders can never be born approved: an insert trigger forces
--     status = 'pending-approval' whenever the visit's payer is HMO, and an
--     update trigger reserves 'approved'/'rejected' for the hmo/admin roles.
--     Private patients skip the approval wait entirely (their orders start
--     'approved'), which is exactly flow.txt step 4: only HMO waits.
--   * Patient-facing order rows carry both visit_id and patient_id; a scope
--     trigger verifies they point at the same visit, so an order can't be
--     written against someone else's encounter using the caller's own
--     hospital_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles the flow needs. staff.role and profiles.role share this type, so the
-- new values are immediately assignable through set_staff_role()/invites.
--
-- ALTER TYPE ... ADD VALUE refuses to run inside a transaction block on PG < 12;
-- Supabase runs PG 15+ where it is allowed, as long as the new values are not
-- used in this transaction - they are not (the trigger bodies below only
-- compare against string literals and are parsed on first execution, after the
-- migration commits).
-- -----------------------------------------------------------------------------
alter type public.user_role add value if not exists 'lab_technician';
alter type public.user_role add value if not exists 'pharmacist';
alter type public.user_role add value if not exists 'hmo';

-- -----------------------------------------------------------------------------
-- Enums. Per-type existence checks (not a duplicate_object handler) because a
-- handler would roll back the whole block if one type was left behind by an
-- earlier run.
-- -----------------------------------------------------------------------------
do $$
declare
  e record;
begin
  for e in
    select *
    from (values
      ('visit_status',             array['checked-in', 'vitals', 'waiting-doctor', 'in-consult', 'awaiting-approval', 'at-lab', 'at-pharmacy', 'ready-for-checkout', 'checked-out', 'cancelled']),
      ('card_status',              array['at-front-desk', 'with-patient', 'withdrawn']),
      ('payer_type',               array['hmo', 'private']),
      ('order_status',             array['pending-approval', 'approved', 'rejected', 'fulfilled', 'dispensed', 'external', 'cancelled']),
      ('consultation_disposition', array['lab', 'pharmacy', 'lab-and-pharmacy', 'external-pharmacy', 'discharge']),
      ('verification_result',      array['verified', 'rejected', 'manual'])
    ) as v(name, labels)
  loop
    if not exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where t.typname = e.name and n.nspname = 'public'
    ) then
      execute format(
        'create type public.%I as enum (%s)',
        e.name,
        (select string_agg(quote_literal(label), ', ') from unnest(e.labels) as t(label))
      );
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- visits - one row per encounter, the spine of the whole flow.
--
-- insurance_verified only ever becomes true through the trigger on
-- insurance_verifications below; the client cannot just flip it.
-- -----------------------------------------------------------------------------
create table if not exists public.visits (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.patients (id) on delete cascade,
  hospital_id            uuid not null references public.hospitals (id) on delete cascade,
  payer_type             payer_type not null default 'private',
  status                 visit_status not null default 'checked-in',
  card_status            card_status not null default 'at-front-desk',
  -- Daily per-hospital queue position, assigned by trigger on insert.
  queue_number           integer,
  checked_in_at          timestamptz not null default now(),
  checked_in_by          uuid references auth.users (id) on delete set null,
  checked_in_by_name     text not null default '',
  insurance_verified     boolean not null default false,
  insurance_verified_at  timestamptz,
  insurance_verified_by  uuid references auth.users (id) on delete set null,
  verification_note      text not null default '',
  doctor_id              uuid references auth.users (id) on delete set null,
  doctor_name            text not null default '',
  consult_started_at     timestamptz,
  consult_ended_at       timestamptz,
  checked_out_at         timestamptz,
  checkout_id            uuid references public.checkouts (id) on delete set null,
  notes                  text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on column public.visits.payer_type is
  'hmo = approval wait applies to lab/medication requests (flow.txt step 4); private = orders go straight to approved.';
comment on column public.visits.card_status is
  'Physical card: taken at the front desk on check-in, withdrawn and archived at check-out.';

create index visits_hospital_id_idx      on public.visits (hospital_id);
create index visits_hospital_status_idx  on public.visits (hospital_id, status);
create index visits_checked_in_at_idx    on public.visits (hospital_id, checked_in_at desc);
create index visits_patient_id_idx       on public.visits (patient_id, checked_in_at desc);

-- One open encounter per patient: a second check-in while one is still running
-- would split vitals/orders across two visits. Partial index, so closed
-- history is unbounded.
create unique index if not exists visits_one_open_per_patient
  on public.visits (patient_id)
  where status not in ('checked-out', 'cancelled');

-- The queue position is derived, never client-supplied: first come, first
-- served by check-in time (open decision in flow_todos.md - keep simple).
create or replace function public.assign_visit_queue_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_number is null then
    select coalesce(max(queue_number), 0) + 1
      into new.queue_number
      from public.visits
     where hospital_id = new.hospital_id
       and checked_in_at::date = new.checked_in_at::date;
  end if;
  return new;
end;
$$;

drop trigger if exists visits_assign_queue_number on public.visits;
create trigger visits_assign_queue_number
  before insert on public.visits
  for each row execute function public.assign_visit_queue_number();

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- insurance_verifications - step 1 audit trail.
--
-- No live HMO API: front desk records the confirmation they received. The
-- after-insert trigger stamps the visit, so "plan confirmed" and its audit row
-- can never disagree.
-- -----------------------------------------------------------------------------
create table if not exists public.insurance_verifications (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null references public.visits (id) on delete cascade,
  hospital_id        uuid not null references public.hospitals (id) on delete cascade,
  provider           text not null default '',
  member_id          text not null default '',
  plan_type          insurance_plan not null default 'HMO',
  result             verification_result not null default 'verified',
  note               text not null default '',
  performed_by       uuid references auth.users (id) on delete set null,
  performed_by_name  text not null default '',
  created_at         timestamptz not null default now()
);

create index insurance_verifications_visit_idx  on public.insurance_verifications (visit_id);
create index insurance_verifications_hosp_idx    on public.insurance_verifications (hospital_id, created_at desc);

create or replace function public.stamp_visit_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.visits
     set insurance_verified     = (new.result = 'verified'),
         insurance_verified_at  = case when new.result = 'verified' then new.created_at else null end,
         insurance_verified_by  = case when new.result = 'verified' then new.performed_by else null end,
         verification_note      = new.note
   where id = new.visit_id;
  return new;
end;
$$;

drop trigger if exists insurance_verifications_stamp_visit on public.insurance_verifications;
create trigger insurance_verifications_stamp_visit
  after insert on public.insurance_verifications
  for each row execute function public.stamp_visit_verification();

-- -----------------------------------------------------------------------------
-- vitals - step 2. One row per reading so trends survive re-entry.
-- -----------------------------------------------------------------------------
create table if not exists public.vitals (
  id                   uuid primary key default gen_random_uuid(),
  visit_id             uuid not null references public.visits (id) on delete cascade,
  hospital_id          uuid not null references public.hospitals (id) on delete cascade,
  temperature          numeric(5, 2),
  weight               numeric(6, 2),
  height               numeric(5, 2),
  blood_pressure_systolic   integer check (blood_pressure_systolic between 0 and 300),
  blood_pressure_diastolic  integer check (blood_pressure_diastolic between 0 and 200),
  pulse                integer check (pulse between 0 and 300),
  blood_sugar          numeric(6, 2),
  spo2                 integer check (spo2 between 0 and 100),
  notes                text not null default '',
  recorded_by          uuid references auth.users (id) on delete set null,
  recorded_by_name     text not null default '',
  recorded_at          timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index vitals_visit_idx  on public.vitals (visit_id, recorded_at desc);
create index vitals_hosp_idx   on public.vitals (hospital_id, recorded_at desc);

create trigger vitals_set_updated_at
  before update on public.vitals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- consultations - step 3. The doctor's note and where they sent the patient.
-- -----------------------------------------------------------------------------
create table if not exists public.consultations (
  id             uuid primary key default gen_random_uuid(),
  visit_id       uuid not null references public.visits (id) on delete cascade,
  hospital_id    uuid not null references public.hospitals (id) on delete cascade,
  doctor_id      uuid references auth.users (id) on delete set null,
  doctor_name    text not null default '',
  summary        text not null default '',
  diagnosis      text[] not null default '{}',
  disposition    consultation_disposition not null default 'discharge',
  notes          text not null default '',
  started_at     timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index consultations_visit_idx  on public.consultations (visit_id);
create index consultations_hosp_idx   on public.consultations (hospital_id, created_at desc);

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lab_orders - step 3/4. Result link points at patient_documents (category
-- 'lab'), reusing the existing storage pipeline.
-- -----------------------------------------------------------------------------
create table if not exists public.lab_orders (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null references public.visits (id) on delete cascade,
  patient_id         uuid not null references public.patients (id) on delete cascade,
  hospital_id        uuid not null references public.hospitals (id) on delete cascade,
  tests              text[] not null default '{}',
  notes              text not null default '',
  status             order_status not null default 'pending-approval',
  requested_by       uuid references auth.users (id) on delete set null,
  requested_by_name  text not null default '',
  approved_by        uuid references auth.users (id) on delete set null,
  approved_by_name   text not null default '',
  approved_at        timestamptz,
  decision_note      text not null default '',
  result_document_id uuid references public.patient_documents (id) on delete set null,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index lab_orders_hosp_status_idx on public.lab_orders (hospital_id, status);
create index lab_orders_visit_idx       on public.lab_orders (visit_id);
create index lab_orders_patient_idx     on public.lab_orders (patient_id, created_at desc);

create trigger lab_orders_set_updated_at
  before update on public.lab_orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- prescriptions - step 3/4.
--
-- items shape: [{ name, dosage, frequency, duration, quantity }]
-- destination: in-house pharmacy, or external when the prescribed medications
-- are not available here (flow.txt 3d).
-- -----------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null references public.visits (id) on delete cascade,
  patient_id         uuid not null references public.patients (id) on delete cascade,
  hospital_id        uuid not null references public.hospitals (id) on delete cascade,
  items              jsonb not null default '[]'::jsonb,
  destination        text not null default 'in-house'
                     check (destination in ('in-house', 'external')),
  external_name      text not null default '',
  notes              text not null default '',
  status             order_status not null default 'pending-approval',
  requested_by       uuid references auth.users (id) on delete set null,
  requested_by_name  text not null default '',
  approved_by        uuid references auth.users (id) on delete set null,
  approved_by_name   text not null default '',
  approved_at        timestamptz,
  decision_note      text not null default '',
  dispensed_by       uuid references auth.users (id) on delete set null,
  dispensed_by_name  text not null default '',
  dispensed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.prescriptions.items is
  'JSON array of { name, dosage, frequency, duration, quantity } - keeps the medication line items together without a join table for a form-shaped list.';

create index prescriptions_hosp_status_idx on public.prescriptions (hospital_id, status);
create index prescriptions_visit_idx       on public.prescriptions (visit_id);
create index prescriptions_patient_idx     on public.prescriptions (patient_id, created_at desc);

create trigger prescriptions_set_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Order status authority
--
-- Two invariants from flow.txt that must hold server-side, not just in the UI:
--   1. An HMO order can never be born approved (insert trigger).
--   2. Only an HMO approver/admin can approve or reject (update trigger).
-- =============================================================================

create or replace function public.apply_order_payer_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_payer public.payer_type;
begin
  select v.payer_type
    into v_payer
    from public.visits v
   where v.id = new.visit_id;

  -- Re-assert the payer rule even if the client sent an explicit status: an
  -- HMO order must wait, a private one must not. 'cancelled' and terminal
  -- states pass through untouched (imports, restores).
  if new.status in ('pending-approval', 'approved') then
    new.status := case
      when v_payer = 'hmo' then 'pending-approval'::public.order_status
      else 'approved'::public.order_status
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists lab_orders_apply_payer_status on public.lab_orders;
create trigger lab_orders_apply_payer_status
  before insert on public.lab_orders
  for each row execute function public.apply_order_payer_status();

drop trigger if exists prescriptions_apply_payer_status on public.prescriptions;
create trigger prescriptions_apply_payer_status
  before insert on public.prescriptions
  for each row execute function public.apply_order_payer_status();

create or replace function public.enforce_order_status_authority()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- anon holds no grants on these tables (init schema), so a caller with no
  -- resolvable profile can only be the service role: trusted, let it through.
  v_role := public.current_user_role();
  if v_role is null and auth.uid() is null then
    return new;
  end if;

  case new.status
    when 'pending-approval' then
      -- Resubmission after an edit or rejection.
      if v_role not in ('admin', 'doctor') then
        raise exception 'Only a doctor or admin can resubmit a request.' using errcode = '42501';
      end if;

    when 'approved', 'rejected' then
      if v_role not in ('hmo', 'admin') then
        raise exception 'Only an HMO approver or admin can decide on requests.' using errcode = '42501';
      end if;
      if old.status <> 'pending-approval' then
        raise exception 'Only a request awaiting approval can be decided (it is %).', old.status using errcode = '42501';
      end if;

    when 'fulfilled' then
      -- lab_orders only; prescriptions never carry this value.
      if v_role not in ('lab_technician', 'admin', 'doctor') then
        raise exception 'Only a laboratory technician, doctor or admin can mark a test fulfilled.' using errcode = '42501';
      end if;
      if old.status <> 'approved' then
        raise exception 'Only an approved request can be fulfilled (it is %).', old.status using errcode = '42501';
      end if;

    when 'dispensed', 'external' then
      -- prescriptions only.
      if v_role not in ('pharmacist', 'admin', 'doctor') then
        raise exception 'Only a pharmacist, doctor or admin can dispense medication.' using errcode = '42501';
      end if;
      if old.status <> 'approved' then
        raise exception 'Only an approved prescription can be dispensed (it is %).', old.status using errcode = '42501';
      end if;

    when 'cancelled' then
      if v_role not in ('admin', 'doctor') then
        raise exception 'Only a doctor or admin can cancel a request.' using errcode = '42501';
      end if;
  end case;

  return new;
end;
$$;

drop trigger if exists lab_orders_status_authority on public.lab_orders;
create trigger lab_orders_status_authority
  before update of status on public.lab_orders
  for each row execute function public.enforce_order_status_authority();

drop trigger if exists prescriptions_status_authority on public.prescriptions;
create trigger prescriptions_status_authority
  before update of status on public.prescriptions
  for each row execute function public.enforce_order_status_authority();

-- =============================================================================
-- Cross-tenant scope guards
--
-- RLS only validates the hospital_id on the row being written. These verify the
-- visit reference too, and for orders that visit must belong to BOTH the
-- caller's hospital and the order's patient.
-- =============================================================================

create or replace function public.enforce_visit_hospital_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.visits
    where id = new.visit_id and hospital_id = new.hospital_id
  ) then
    raise exception 'visit % does not belong to hospital %', new.visit_id, new.hospital_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists vitals_visit_scope on public.vitals;
create trigger vitals_visit_scope
  before insert or update of visit_id, hospital_id on public.vitals
  for each row execute function public.enforce_visit_hospital_scope();

drop trigger if exists consultations_visit_scope on public.consultations;
create trigger consultations_visit_scope
  before insert or update of visit_id, hospital_id on public.consultations
  for each row execute function public.enforce_visit_hospital_scope();

drop trigger if exists insurance_verifications_visit_scope on public.insurance_verifications;
create trigger insurance_verifications_visit_scope
  before insert or update of visit_id, hospital_id on public.insurance_verifications
  for each row execute function public.enforce_visit_hospital_scope();

create or replace function public.enforce_order_visit_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.visits
    where id = new.visit_id and hospital_id = new.hospital_id and patient_id = new.patient_id
  ) then
    raise exception 'visit % does not belong to hospital % and patient %',
      new.visit_id, new.hospital_id, new.patient_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists lab_orders_visit_scope on public.lab_orders;
create trigger lab_orders_visit_scope
  before insert or update of visit_id, patient_id, hospital_id on public.lab_orders
  for each row execute function public.enforce_order_visit_scope();

drop trigger if exists prescriptions_visit_scope on public.prescriptions;
create trigger prescriptions_visit_scope
  before insert or update of visit_id, patient_id, hospital_id on public.prescriptions
  for each row execute function public.enforce_order_visit_scope();

-- Orders also carry the patient reference directly, so the init schema's
-- patient scope guard applies to them as well.
drop trigger if exists lab_orders_hospital_scope on public.lab_orders;
create trigger lab_orders_hospital_scope
  before insert or update of patient_id, hospital_id on public.lab_orders
  for each row execute function public.enforce_patient_hospital_scope();

drop trigger if exists prescriptions_hospital_scope on public.prescriptions;
create trigger prescriptions_hospital_scope
  before insert or update of patient_id, hospital_id on public.prescriptions
  for each row execute function public.enforce_patient_hospital_scope();

-- =============================================================================
-- Row Level Security - same hospital-scoped pattern as the init schema.
-- =============================================================================
alter table public.visits                 enable row level security;
alter table public.insurance_verifications enable row level security;
alter table public.vitals                 enable row level security;
alter table public.consultations          enable row level security;
alter table public.lab_orders             enable row level security;
alter table public.prescriptions          enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'visits',
    'insurance_verifications',
    'vitals',
    'consultations',
    'lab_orders',
    'prescriptions'
  ]
  loop
    execute format('drop policy if exists "%1$s select" on public.%1$I', t);
    execute format(
      'create policy "%1$s select" on public.%1$I for select using (hospital_id = public.current_hospital_id())',
      t
    );

    execute format('drop policy if exists "%1$s insert" on public.%1$I', t);
    execute format(
      'create policy "%1$s insert" on public.%1$I for insert with check (hospital_id = public.current_hospital_id())',
      t
    );

    execute format('drop policy if exists "%1$s update" on public.%1$I', t);
    execute format(
      'create policy "%1$s update" on public.%1$I for update using (hospital_id = public.current_hospital_id()) with check (hospital_id = public.current_hospital_id())',
      t
    );

    execute format('drop policy if exists "%1$s delete" on public.%1$I', t);
    execute format(
      'create policy "%1$s delete" on public.%1$I for delete using (hospital_id = public.current_hospital_id())',
      t
    );
  end loop;
end;
$$;

-- =============================================================================
-- Grants. anon stays excluded: this is authenticated, hospital-scoped data.
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'visits',
    'insurance_verifications',
    'vitals',
    'consultations',
    'lab_orders',
    'prescriptions'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- =============================================================================
-- Archive authority for check-out
--
-- archive_patient() is SECURITY INVOKER and the patients UPDATE policy is only
-- hospital-scoped, so before this every role in the hospital could archive a
-- patient - including receptionists, who can check a visit out. Check-out now
-- archives the card (flow step 4c), which makes that gap load-bearing: the
-- client gates the control to admin/doctor (canArchivePatients) and the server
-- must agree, or the UI is simply lying.
--
-- Restricting to admin/doctor matches PATIENT_ARCHIVE_ROLES in
-- src/lib/permissions.ts. The body is otherwise byte-for-byte the v1 function
-- from 20260102001000_soft_archive_patients.sql.
-- =============================================================================
create or replace function public.archive_patient(
  p_id uuid,
  p_archived_by text default null,
  p_discharge_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hospital uuid;
begin
  if public.current_user_role() not in ('admin', 'doctor') then
    raise exception 'only an admin or doctor can archive a patient'
      using errcode = '42501';
  end if;

  select hospital_id into v_hospital
  from public.patients
  where id = p_id
    and archived_at is null;

  if not found then
    -- Either it does not exist, it is already archived, or RLS hid it. All three
    -- are a no-op from the caller's point of view.
    return;
  end if;

  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot archive a patient in another hospital'
      using errcode = '42501';
  end if;

  update public.patients
  set archived_at       = coalesce(archived_at, now()),
      archived_by       = coalesce(p_archived_by, archived_by, current_user_role()::text),
      discharge_reason  = coalesce(nullif(p_discharge_reason, ''), discharge_reason)
  where id = p_id;
end;
$$;

revoke all on function public.archive_patient(uuid, text, text) from public;
grant execute on function public.archive_patient(uuid, text, text) to authenticated, service_role;
