-- =============================================================================
-- CardEase - audit trail + access control
--
-- This migration adds the compliance controls that encryption alone cannot
-- provide. Nothing here changes the shape of existing clinical tables, so the
-- client data layer keeps working unchanged.
--
--   1. public.audit_events - an append-only record of every write to a
--      clinical table, plus explicit read/export records.
--   2. Role-scoped SELECT policies for the tables that carry the most
--      sensitive content (consultation notes, vitals, insurance identifiers,
--      documents, emergency contacts). Tenancy remains the outer boundary;
--      role is now an inner one.
--   3. Optional MFA enforcement driven by hospitals.settings.requireMFA.
--   4. A server-enforced gate for patient data exports, backed by
--      hospitals.settings.allowPatientExport (previously type-only).
--
-- Important operational note: requireMFA defaults to false. Turning it on
-- before the hospital's staff have enrolled a TOTP factor will lock them out of
-- clinical reads and writes by design. The client has no enrolment screen yet;
-- add one (supabase.auth.mfa.enroll/challenge/verify) before flipping the flag.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Audit action vocabulary.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'audit_action' and n.nspname = 'public'
  ) then
    -- Utility statements cannot be written statically inside PL/pgSQL; the
    -- init schema uses EXECUTE for the same reason.
    execute 'create type public.audit_action as enum (''insert'', ''update'', ''delete'', ''read'', ''export'')';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- MFA helpers.
--
-- requireMFA is read from the tenant's own settings row, so one hospital can
-- mandate a second factor without affecting another. The policy checks the
-- `aal` claim Supabase puts on the JWT after a TOTP challenge is verified.
--
-- Defined before the audit table because its SELECT policy references
-- mfa_satisfied(); PostgreSQL resolves the function at CREATE POLICY time.
-- -----------------------------------------------------------------------------
create or replace function public.hospital_requires_mfa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((h.settings ->> 'requireMFA')::boolean, false)
  from public.hospitals h
  where h.id = public.current_hospital_id();
$$;

create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not coalesce(public.hospital_requires_mfa(), false)
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

revoke all on function public.hospital_requires_mfa() from public;
revoke all on function public.mfa_satisfied() from public;
grant execute on function public.mfa_satisfied() to authenticated, service_role;

-- Belt-and-braces for writes: RLS policies can be overlooked on an INSERT, a
-- trigger cannot. System contexts (auth.uid() is null: migrations, auth hooks)
-- are exempt so background jobs keep working.
create or replace function public.enforce_mfa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.mfa_satisfied() then
    raise exception 'multi-factor authentication is required by this hospital'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_mfa() from public;

-- -----------------------------------------------------------------------------
-- audit_events.
--
-- Deliberately has no foreign key on hospital_id or patient_id: an audit record
-- must survive the deletion of the thing it describes. hospital_id is carried
-- as a plain uuid so RLS can still scope reads to the caller's tenant.
--
-- Only column NAMES are stored for writes, never values. Values are exactly
-- what an auditor does not need (and what an attacker would love to find in the
-- audit log). Read/export rows may carry a small metadata blob (e.g. an export
-- count), which callers must keep free of patient identifiers.
-- -----------------------------------------------------------------------------
create table if not exists public.audit_events (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz not null default now(),
  hospital_id      uuid not null,
  actor_id         uuid,
  actor_name       text not null default '',
  actor_role       public.user_role,
  action           public.audit_action not null,
  table_name       text not null,
  row_id           uuid,
  patient_id       uuid,
  changed_columns  text[] not null default '{}',
  metadata         jsonb not null default '{}'::jsonb
);

comment on table public.audit_events is
  'Append-only audit trail. Writes come from triggers and the SECURITY DEFINER helpers below; no client role may insert, update or delete.';
comment on column public.audit_events.changed_columns is
  'Column names touched by the change. Values are intentionally never recorded.';
comment on column public.audit_events.patient_id is
  'Best-effort subject of the event so an access report can answer "who looked at this patient".';

create index if not exists audit_events_hospital_time_idx
  on public.audit_events (hospital_id, occurred_at desc);
create index if not exists audit_events_patient_time_idx
  on public.audit_events (patient_id, occurred_at desc);
create index if not exists audit_events_actor_time_idx
  on public.audit_events (actor_id, occurred_at desc);
create index if not exists audit_events_table_row_idx
  on public.audit_events (table_name, row_id);
create index if not exists audit_events_action_idx
  on public.audit_events (hospital_id, action, occurred_at desc);

alter table public.audit_events enable row level security;

-- Admins read the trail; nobody edits or deletes it through PostgREST. The
-- append-only trigger below also blocks the table owner, so retention purges
-- must be an explicit, audited operational action (disable the trigger inside a
-- transaction, delete by cutoff, restore the trigger).
drop policy if exists "audit_events select admin" on public.audit_events;
create policy "audit_events select admin"
  on public.audit_events for select
  using (
    public.is_admin()
    and hospital_id = public.current_hospital_id()
    and public.mfa_satisfied()
  );

revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;

create or replace function public.deny_audit_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_events is append-only' using errcode = '42501';
end;
$$;

revoke all on function public.deny_audit_event_mutation() from public;

drop trigger if exists audit_events_append_only on public.audit_events;
create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.deny_audit_event_mutation();

drop trigger if exists audit_events_no_truncate on public.audit_events;
create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.deny_audit_event_mutation();

-- -----------------------------------------------------------------------------
-- Generic audit trigger.
--
-- Attached to every table whose contents are patient data or access control.
-- The function resolves hospital/patient/row from the row itself so the caller
-- never supplies any of them.
-- -----------------------------------------------------------------------------
create or replace function public.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new        jsonb;
  v_old        jsonb;
  v_row        jsonb;
  v_hospital   uuid;
  v_patient    uuid;
  v_actor      uuid := auth.uid();
  v_actor_name text := '';
  v_actor_role public.user_role;
  v_action     public.audit_action;
  v_changed    text[] := '{}';
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := v_old;
    v_action := 'delete';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
    v_action := 'update';
  else
    v_new := to_jsonb(new);
    v_row := v_new;
    v_action := 'insert';
  end if;

  -- The tenant root names its own id column; every other audited table carries
  -- hospital_id.
  if tg_table_name = 'hospitals' then
    v_hospital := nullif(v_row ->> 'id', '')::uuid;
  else
    v_hospital := nullif(v_row ->> 'hospital_id', '')::uuid;
  end if;

  if v_hospital is null then
    -- Not tenant-scoped (or a malformed row); nothing meaningful to attribute.
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Resolve the patient this row belongs to. Child rows that only carry a
  -- visit/checkout get one extra lookup; if the parent is already gone during a
  -- cascade the id stays null rather than blocking the delete.
  if v_row ? 'patient_id' then
    v_patient := nullif(v_row ->> 'patient_id', '')::uuid;
  elsif tg_table_name = 'patients' then
    v_patient := nullif(v_row ->> 'id', '')::uuid;
  elsif v_row ? 'visit_id' then
    select patient_id into v_patient
    from public.visits
    where id = nullif(v_row ->> 'visit_id', '')::uuid;
  elsif v_row ? 'checkout_id' then
    select patient_id into v_patient
    from public.checkouts
    where id = nullif(v_row ->> 'checkout_id', '')::uuid;
  end if;

  if v_actor is not null then
    select p.name, p.role
      into v_actor_name, v_actor_role
      from public.profiles p
     where p.id = v_actor;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}')
      into v_changed
      from (
        select jsonb_object_keys(v_new) as k
        union
        select jsonb_object_keys(v_old) as k
      ) keys
     where k <> 'updated_at'
       and (v_old -> k) is distinct from (v_new -> k);
  else
    select coalesce(array_agg(k order by k), '{}')
      into v_changed
      from jsonb_object_keys(v_row) as k;
  end if;

  insert into public.audit_events (
    hospital_id, actor_id, actor_name, actor_role, action,
    table_name, row_id, patient_id, changed_columns
  )
  values (
    v_hospital, v_actor, coalesce(v_actor_name, ''), v_actor_role, v_action,
    tg_table_name, nullif(v_row ->> 'id', '')::uuid, v_patient, v_changed
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.record_audit_event() from public;

-- Tables whose every change is compliance-relevant. `profiles`, `hospitals`
-- and `hospital_invites` are included because they control who can reach
-- patient data.
do $$
declare
  t text;
begin
  foreach t in array array[
    'hospitals',
    'hospital_invites',
    'profiles',
    'patients',
    'emergency_contacts',
    'patient_insurance',
    'patient_documents',
    'checkouts',
    'follow_up_appointments',
    'visits',
    'insurance_verifications',
    'vitals',
    'consultations',
    'lab_orders',
    'prescriptions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.record_audit_event()',
      t || '_audit',
      t
    );
  end loop;
end;
$$;

-- MFA gate on writes to the clinical tables (settings/hospitals excluded so an
-- admin can still reach the screen that turns the requirement on).
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients',
    'emergency_contacts',
    'patient_insurance',
    'patient_documents',
    'checkouts',
    'follow_up_appointments',
    'visits',
    'insurance_verifications',
    'vitals',
    'consultations',
    'lab_orders',
    'prescriptions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_enforce_mfa', t);
    execute format(
      'create trigger %I before insert or update or delete on public.%I for each row execute function public.enforce_mfa()',
      t || '_enforce_mfa',
      t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Read and export records.
--
-- Triggers cannot see SELECT, so the client records an access event when it
-- opens a patient record. This is not a substitute for server-side access
-- logging (pgaudit) but it is enough to answer "who opened this chart" from the
-- application path.
-- -----------------------------------------------------------------------------
create or replace function public.log_patient_access(
  p_patient_id uuid,
  p_action public.audit_action default 'read',
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital   uuid;
  v_actor      uuid := auth.uid();
  v_name       text := '';
  v_role       public.user_role;
begin
  if p_action not in ('read', 'export') then
    raise exception 'log_patient_access only records read or export events'
      using errcode = '22023';
  end if;

  select hospital_id into v_hospital
  from public.patients
  where id = p_patient_id;

  if v_hospital is null then
    return;
  end if;

  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot record access to another hospital''s patient'
      using errcode = '42501';
  end if;

  select name, role into v_name, v_role
  from public.profiles
  where id = v_actor;

  insert into public.audit_events (
    hospital_id, actor_id, actor_name, actor_role, action,
    table_name, row_id, patient_id, metadata
  )
  values (
    v_hospital, v_actor, coalesce(v_name, ''), v_role, p_action,
    'patients', p_patient_id, p_patient_id, coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_patient_access(uuid, public.audit_action, jsonb) from public;
grant execute on function public.log_patient_access(uuid, public.audit_action, jsonb)
  to authenticated, service_role;

create or replace function public.assert_patient_export_allowed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  select coalesce((settings ->> 'allowPatientExport')::boolean, false)
    into v_allowed
  from public.hospitals
  where id = public.current_hospital_id();

  if not coalesce(v_allowed, false) then
    raise exception 'patient export is disabled for this hospital'
      using errcode = '42501';
  end if;

  if not public.mfa_satisfied() then
    raise exception 'multi-factor authentication is required by this hospital'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_patient_export_allowed() from public;
grant execute on function public.assert_patient_export_allowed() to authenticated, service_role;

create or replace function public.log_patient_export(
  p_count integer,
  p_format text default 'csv'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital uuid := public.current_hospital_id();
  v_actor    uuid := auth.uid();
  v_name     text := '';
  v_role     public.user_role;
begin
  -- Re-check server-side so a client cannot skip the UI gate.
  perform public.assert_patient_export_allowed();

  if v_hospital is null then
    raise exception 'no hospital in scope' using errcode = '42501';
  end if;

  if p_count is null or p_count < 0 then
    raise exception 'export count must be non-negative' using errcode = '22023';
  end if;

  select name, role into v_name, v_role
  from public.profiles
  where id = v_actor;

  insert into public.audit_events (
    hospital_id, actor_id, actor_name, actor_role, action,
    table_name, metadata
  )
  values (
    v_hospital, v_actor, coalesce(v_name, ''), v_role, 'export', 'patients',
    jsonb_build_object('count', p_count, 'format', p_format)
  );
end;
$$;

revoke all on function public.log_patient_export(integer, text) from public;
grant execute on function public.log_patient_export(integer, text) to authenticated, service_role;

-- =============================================================================
-- Role-scoped reads.
--
-- RLS is row-level, not column-level: this cannot hide `patients.notes` from a
-- receptionist. What it does is stop roles that have no clinical reason to read
-- a table from reading any of it. The client already gates controls by the same
-- role lists (src/lib/permissions.ts); these policies make the server agree.
--
-- Everything keeps the tenant check first. mfa_satisfied() is a no-op unless
-- the hospital opted in.
-- =============================================================================

-- patients and visits stay readable by every hospital member: front desk, lab,
-- pharmacy and HMO all need the encounter context to do their job.
drop policy if exists "patients select" on public.patients;
create policy "patients select"
  on public.patients for select
  using (
    hospital_id = public.current_hospital_id()
    and public.mfa_satisfied()
  );

drop policy if exists "visits select" on public.visits;
create policy "visits select"
  on public.visits for select
  using (
    hospital_id = public.current_hospital_id()
    and public.mfa_satisfied()
  );

-- Encounter continuity: checkout and follow-up rows stay tenant-wide.
drop policy if exists "checkouts select" on public.checkouts;
create policy "checkouts select"
  on public.checkouts for select
  using (
    hospital_id = public.current_hospital_id()
    and public.mfa_satisfied()
  );

drop policy if exists "follow_up_appointments select" on public.follow_up_appointments;
create policy "follow_up_appointments select"
  on public.follow_up_appointments for select
  using (
    hospital_id = public.current_hospital_id()
    and public.mfa_satisfied()
  );

-- Emergency contacts are next-of-kin PII: clinical + front desk only.
drop policy if exists "emergency_contacts select" on public.emergency_contacts;
create policy "emergency_contacts select"
  on public.emergency_contacts for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

-- Insurance identifiers: needed for check-in, HMO verification and clinical
-- billing decisions. Lab/pharmacy do not need them.
drop policy if exists "patient_insurance select" on public.patient_insurance;
create policy "patient_insurance select"
  on public.patient_insurance for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist', 'hmo']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

drop policy if exists "insurance_verifications select" on public.insurance_verifications;
create policy "insurance_verifications select"
  on public.insurance_verifications for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist', 'hmo']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

-- Vitals and consultation notes/diagnoses are clinical records.
drop policy if exists "vitals select" on public.vitals;
create policy "vitals select"
  on public.vitals for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

drop policy if exists "consultations select" on public.consultations;
create policy "consultations select"
  on public.consultations for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

-- Orders: each fulfiller sees its own queue, front desk sees both for payment,
-- HMO sees both for approval. Cross-coverage is deliberately absent.
drop policy if exists "lab_orders select" on public.lab_orders;
create policy "lab_orders select"
  on public.lab_orders for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'hmo']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

drop policy if exists "prescriptions select" on public.prescriptions;
create policy "prescriptions select"
  on public.prescriptions for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'hmo']::public.user_role[]
    )
    and public.mfa_satisfied()
  );

-- Documents include consent forms, insurance scans and lab results.
drop policy if exists "patient_documents select" on public.patient_documents;
create policy "patient_documents select"
  on public.patient_documents for select
  using (
    hospital_id = public.current_hospital_id()
    and public.current_user_role() = any (
      array['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician']::public.user_role[]
    )
    and public.mfa_satisfied()
  );
