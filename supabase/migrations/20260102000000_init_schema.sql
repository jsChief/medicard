-- =============================================================================
-- Medicard — initial schema
-- Replaces the Firebase/Firestore document model with a relational Postgres
-- schema. Firestore stored `insurance` and `emergencyContacts` as nested
-- objects/arrays inside the patient document; those are normalised into their
-- own tables here.
--
-- Multi-tenancy mirrors firestore.rules: every clinical row carries a
-- hospital_id, and RLS restricts rows to the caller's hospital, resolved from
-- public.profiles (which is keyed by auth.users.id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
--
-- Two details matter here:
--   * Labels are emitted with quote_literal(). Splicing them in raw would
--     produce `enum (admin,doctor,...)`, which Postgres parses as a list of
--     identifiers and rejects with 42601.
--   * Existence is checked per type rather than with a duplicate_object
--     handler: a handler rolls the whole block back, so one type left behind by
--     an earlier run would silently skip creating all the others.
-- -----------------------------------------------------------------------------
do $$
declare
  e record;
begin
  for e in
    select *
    from (values
      ('user_role',         array['admin', 'doctor', 'nurse', 'receptionist']),
      ('patient_gender',    array['M', 'F', 'O']),
      ('blood_type',        array['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
      ('marital_status',    array['single', 'married', 'divorced', 'widowed', 'other']),
      ('patient_status',    array['active', 'discharged', 'transferred', 'critical', 'pending']),
      ('insurance_plan',    array['HMO', 'PPO', 'EPO', 'POS', 'Medicare', 'Medicaid', 'Other']),
      ('location_type',     array['ward', 'icu', 'er', 'clinic', 'ot']),
      ('location_status',   array['normal', 'warning', 'critical', 'maintenance']),
      ('equipment_status',  array['operational', 'degraded', 'offline']),
      ('checkout_status',   array['pending', 'approved', 'in-progress', 'completed', 'cancelled', 'delayed']),
      ('discharge_type',    array['home', 'transfer', 'home-care', 'rehab', 'other']),
      ('archive_status',    array['discharged', 'transferred', 'deceased']),
      ('document_category', array['admission', 'lab', 'imaging', 'notes', 'consent', 'insurance', 'discharge', 'other'])
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
-- Shared trigger: keep updated_at honest without relying on the client.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- hospitals — the tenant root.
-- -----------------------------------------------------------------------------
create table public.hospitals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  logo        text,
  owner_id    uuid references auth.users (id) on delete set null,
  settings    jsonb not null default '{
    "allowPatientExport": true,
    "requireMFA": false,
    "sessionTimeout": 3600
  }'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.hospitals.settings is
  'Mirrors the former HospitalSettings interface: allowPatientExport, requireMFA, sessionTimeout, defaultLanguage, timezone.';

create trigger hospitals_set_updated_at
  before update on public.hospitals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles — replaces the Firestore `users` collection.
-- id doubles as the auth.users id (Firebase used the uid as the document id).
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  name         text not null,
  role         user_role not null default 'receptionist',
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  avatar       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_hospital_id_idx on public.profiles (hospital_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS helper functions.
--
-- Defined after public.profiles so the function bodies resolve at creation
-- time. They are SECURITY DEFINER so that policies can read the caller's own
-- profile row without recursing through the profiles RLS policy, and they are
-- pinned to `search_path = public` to avoid search-path hijacking.
--
-- All three return NULL when signed out or when no profile exists, which makes
-- every `hospital_id = current_hospital_id()` comparison fail closed.
-- -----------------------------------------------------------------------------
create or replace function public.current_hospital_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hospital_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

revoke all on function public.current_hospital_id() from public;
revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_hospital_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- patients
-- -----------------------------------------------------------------------------
create table public.patients (
  id                   uuid primary key default gen_random_uuid(),
  mrn                  text not null,
  first_name           text not null,
  last_name            text not null,
  middle_name          text,
  dob                  date not null,
  gender               patient_gender not null,
  phone                text not null default '',
  email                text,
  address              text not null default '',
  city                 text not null default '',
  state                text not null default '',
  postal_code          text not null default '',
  country              text not null default '',
  blood_type           blood_type not null default 'Unknown',
  marital_status       marital_status not null default 'other',
  occupation           text,
  nationality          text,
  -- Array-typed fields in Firestore become Postgres arrays; simple string lists
  -- do not need their own join tables.
  conditions           text[] not null default '{}',
  medications          text[] not null default '{}',
  allergies            text[] not null default '{}',
  surgeries             text[] not null default '{}',
  family_history       text[] not null default '{}',
  immunizations         text[] not null default '{}',
  notes                text,
  attending_physician  text not null default '',
  department           text not null default '',
  status               patient_status not null default 'active',
  admission_date       timestamptz not null default now(),
  last_visit           timestamptz not null default now(),
  room                 text,
  bed                  text,
  hospital_id          uuid not null references public.hospitals (id) on delete cascade,
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- MRN was unique per hospital in Firestore via an import-time dedupe check.
  -- Enforce it in the database instead.
  constraint patients_mrn_unique_per_hospital unique (hospital_id, mrn)
);

create index patients_hospital_id_idx           on public.patients (hospital_id);
create index patients_last_name_idx             on public.patients (hospital_id, last_name);
create index patients_first_name_idx            on public.patients (hospital_id, first_name);
create index patients_mrn_idx                   on public.patients (hospital_id, mrn);
create index patients_department_idx             on public.patients (hospital_id, department);
create index patients_status_idx                on public.patients (hospital_id, status);
create index patients_admission_date_idx        on public.patients (hospital_id, admission_date);
create index patients_attending_physician_idx   on public.patients (hospital_id, attending_physician);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- emergency_contacts — was a nested array on the patient document.
-- -----------------------------------------------------------------------------
create table public.emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  name         text not null,
  relationship text not null default '',
  phone        text not null default '',
  email        text,
  address      text,
  is_primary   boolean not null default false,
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index emergency_contacts_patient_id_idx on public.emergency_contacts (patient_id);
create index emergency_contacts_hospital_id_idx on public.emergency_contacts (hospital_id);

create trigger emergency_contacts_set_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- patient_insurance — was a nested object on the patient document.
-- One row per patient; secondary coverage lives on the same row.
-- -----------------------------------------------------------------------------
create table public.patient_insurance (
  patient_id              uuid primary key references public.patients (id) on delete cascade,
  provider                text not null default '',
  policy_number           text not null default '',
  group_number            text,
  member_id               text,
  plan_type               insurance_plan not null default 'HMO',
  effective_date          date,
  expiry_date             date,
  copay_amount            text,
  deductible_amount       text,
  coverage_notes          text,
  has_secondary           boolean not null default false,
  secondary_provider      text,
  secondary_policy_number text,
  hospital_id             uuid not null references public.hospitals (id) on delete cascade,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index patient_insurance_hospital_id_idx on public.patient_insurance (hospital_id);

create trigger patient_insurance_set_updated_at
  before update on public.patient_insurance
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- staff
-- -----------------------------------------------------------------------------
create table public.staff (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  hospital_id     uuid not null references public.hospitals (id) on delete cascade,
  name            text not null,
  email           text not null default '',
  role            user_role not null default 'nurse',
  department      text,
  specialization  text,
  license_number  text,
  phone           text,
  avatar          text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index staff_hospital_id_idx on public.staff (hospital_id);
create index staff_is_active_idx   on public.staff (hospital_id, is_active);

create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- locations
-- -----------------------------------------------------------------------------
create table public.locations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             location_type not null default 'ward',
  floor            text not null default '',
  wing             text not null default '',
  capacity         integer not null default 0 check (capacity >= 0),
  occupied         integer not null default 0 check (occupied >= 0),
  available        integer not null default 0 check (available >= 0),
  status           location_status not null default 'normal',
  staff_on_duty    integer not null default 0 check (staff_on_duty >= 0),
  equipment_status equipment_status not null default 'operational',
  notes            text,
  hospital_id      uuid not null references public.hospitals (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index locations_hospital_id_idx on public.locations (hospital_id);
create index locations_name_idx       on public.locations (hospital_id, name);
create index locations_floor_idx      on public.locations (hospital_id, floor);
create index locations_status_idx     on public.locations (hospital_id, status);

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- checkouts
-- -----------------------------------------------------------------------------
create table public.checkouts (
  id                       uuid primary key default gen_random_uuid(),
  patient_id               uuid not null references public.patients (id) on delete cascade,
  patient_name             text not null default '',
  mrn                      text not null default '',
  department               text not null default '',
  room                     text,
  bed                      text,
  attending_physician      text not null default '',
  admission_date           timestamptz not null default now(),
  expected_discharge_date  timestamptz not null default now(),
  actual_discharge_date    timestamptz,
  status                   checkout_status not null default 'pending',
  discharge_type           discharge_type not null default 'home',
  discharge_summary        text,
  medications              text[] not null default '{}',
  pending_tasks            text[] not null default '{}',
  hospital_id              uuid not null references public.hospitals (id) on delete cascade,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index checkouts_hospital_id_idx             on public.checkouts (hospital_id);
create index checkouts_patient_id_idx              on public.checkouts (patient_id);
create index checkouts_status_idx                  on public.checkouts (hospital_id, status);
create index checkouts_expected_discharge_date_idx on public.checkouts (hospital_id, expected_discharge_date);
create index checkouts_created_at_idx              on public.checkouts (hospital_id, created_at);

create trigger checkouts_set_updated_at
  before update on public.checkouts
  for each row execute function public.set_updated_at();

-- follow_up_appointments — was a nested array on the checkout document.
create table public.follow_up_appointments (
  id           uuid primary key default gen_random_uuid(),
  checkout_id  uuid not null references public.checkouts (id) on delete cascade,
  specialty    text not null default '',
  date         timestamptz,
  provider     text not null default '',
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index follow_up_appointments_checkout_id_idx on public.follow_up_appointments (checkout_id);
create index follow_up_appointments_hospital_id_idx  on public.follow_up_appointments (hospital_id);

create trigger follow_up_appointments_set_updated_at
  before update on public.follow_up_appointments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- archives
-- -----------------------------------------------------------------------------
create table public.archives (
  id                uuid primary key default gen_random_uuid(),
  mrn               text not null,
  name              text not null,
  dob               date not null,
  age               integer not null default 0,
  department        text not null default '',
  status            archive_status not null default 'discharged',
  attending_physician text not null default '',
  admission_date    timestamptz not null,
  discharge_date    timestamptz not null,
  discharge_reason  text not null default '',
  archived_at       timestamptz not null default now(),
  archived_by       text not null default '',
  conditions        text[] not null default '{}',
  length_of_stay    integer not null default 0,
  hospital_id       uuid not null references public.hospitals (id) on delete cascade,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index archives_hospital_id_idx on public.archives (hospital_id);
create index archives_archived_at_idx on public.archives (hospital_id, archived_at);
create index archives_status_idx     on public.archives (hospital_id, status);
create index archives_department_idx on public.archives (hospital_id, department);

create trigger archives_set_updated_at
  before update on public.archives
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- patient_documents — metadata for blobs in the `patient-documents` bucket.
-- Object keys follow: {hospital_id}/{patient_id}/{id}/{file_name}
-- -----------------------------------------------------------------------------
create table public.patient_documents (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients (id) on delete cascade,
  hospital_id      uuid not null references public.hospitals (id) on delete cascade,
  name             text not null,
  file_name        text not null,
  mime_type        text not null default 'application/octet-stream',
  size_bytes       bigint not null default 0 check (size_bytes >= 0),
  storage_path     text not null,
  category         document_category not null default 'other',
  uploaded_by      uuid references auth.users (id) on delete set null,
  uploaded_by_name text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index patient_documents_patient_id_idx on public.patient_documents (patient_id);
create index patient_documents_hospital_idx   on public.patient_documents (hospital_id, patient_id, created_at desc);
create index patient_documents_category_idx   on public.patient_documents (hospital_id, patient_id, category);

create trigger patient_documents_set_updated_at
  before update on public.patient_documents
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Cross-tenant referential integrity
--
-- RLS only validates the hospital_id stored on the row being written. A caller
-- could therefore insert an emergency contact, insurance policy, checkout or
-- document row carrying their OWN hospital_id but pointing at a patient_id (or
-- checkout_id) that belongs to a different hospital, because plain foreign keys
-- do not see RLS. These guards close that gap.
-- =============================================================================
create or replace function public.enforce_patient_hospital_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.patients
    where id = new.patient_id and hospital_id = new.hospital_id
  ) then
    raise exception 'patient % does not belong to hospital %', new.patient_id, new.hospital_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_checkout_hospital_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.checkouts
    where id = new.checkout_id and hospital_id = new.hospital_id
  ) then
    raise exception 'checkout % does not belong to hospital %', new.checkout_id, new.hospital_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger emergency_contacts_hospital_scope
  before insert or update of patient_id, hospital_id on public.emergency_contacts
  for each row execute function public.enforce_patient_hospital_scope();

create trigger patient_insurance_hospital_scope
  before insert or update of patient_id, hospital_id on public.patient_insurance
  for each row execute function public.enforce_patient_hospital_scope();

create trigger checkouts_hospital_scope
  before insert or update of patient_id, hospital_id on public.checkouts
  for each row execute function public.enforce_patient_hospital_scope();

-- archives is deliberately absent from this list. It is a detached snapshot:
-- it copies the patient's details at discharge and keeps no patient_id, so
-- there is no cross-tenant reference to validate. Its only tenant boundary is
-- hospital_id, which the RLS policy below already enforces on every write.

create trigger patient_documents_hospital_scope
  before insert or update of patient_id, hospital_id on public.patient_documents
  for each row execute function public.enforce_patient_hospital_scope();

create trigger follow_up_appointments_hospital_scope
  before insert or update of checkout_id, hospital_id on public.follow_up_appointments
  for each row execute function public.enforce_checkout_hospital_scope();

-- =============================================================================
-- Row Level Security
-- Mirrors firestore.rules: every clinical collection required the document's
-- hospitalId to equal the signed-in user's profile hospitalId.
-- =============================================================================

alter table public.hospitals           enable row level security;
alter table public.profiles           enable row level security;
alter table public.patients           enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.patient_insurance   enable row level security;
alter table public.staff              enable row level security;
alter table public.locations          enable row level security;
alter table public.checkouts          enable row level security;
alter table public.follow_up_appointments enable row level security;
alter table public.archives           enable row level security;
alter table public.patient_documents  enable row level security;

-- --- profiles ----------------------------------------------------------------
-- A user manages their own profile; admins may read peers in the same hospital.
drop policy if exists "profiles select own or same hospital" on public.profiles;
create policy "profiles select own or same hospital"
  on public.profiles for select
  using (auth.uid() = id or hospital_id = public.current_hospital_id());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles delete own" on public.profiles;
create policy "profiles delete own"
  on public.profiles for delete
  using (auth.uid() = id);

-- --- hospitals ---------------------------------------------------------------
-- Readable by any signed-in user. Managed by the owner who created it.
drop policy if exists "hospitals select signed in" on public.hospitals;
create policy "hospitals select signed in"
  on public.hospitals for select
  using (auth.uid() is not null);

drop policy if exists "hospitals insert signed in" on public.hospitals;
create policy "hospitals insert signed in"
  on public.hospitals for insert
  with check (auth.uid() is not null);

drop policy if exists "hospitals update owner" on public.hospitals;
create policy "hospitals update owner"
  on public.hospitals for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- No delete policy: hospitals are never deletable, matching firestore.rules.

-- --- hospital-scoped clinical tables ----------------------------------------
-- Reusable policies. Applied per table below via `alter table ... enable row
-- level security` (already done) plus these DO blocks.
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients',
    'emergency_contacts',
    'patient_insurance',
    'staff',
    'locations',
    'checkouts',
    'follow_up_appointments',
    'archives',
    'patient_documents'
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

-- -----------------------------------------------------------------------------
-- Grants.
--
-- RLS decides *which* rows are visible; these grants decide that the client
-- roles are allowed to touch the tables at all. anon is deliberately excluded:
-- every table here is hospital-scoped clinical data behind authentication.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'hospitals',
    'profiles',
    'patients',
    'emergency_contacts',
    'patient_insurance',
    'staff',
    'locations',
    'checkouts',
    'follow_up_appointments',
    'archives',
    'patient_documents'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%1$I to authenticated, service_role', t);
    execute format('revoke all on public.%1$I from anon', t);
  end loop;
end;
$$;