-- =============================================================================
-- Medicard — storage bucket + auth wiring
-- Replaces storage.rules. Patient documents live in a private bucket with the
-- object key: {hospital_id}/{patient_id}/{document_id}/{file_name}
--
-- The same object key mirrors public.patient_documents.storage_path, which is
-- how the app resolves a document row to its blob.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Private bucket. NOT public: patient records must only be reachable via a
-- signed URL issued to an authenticated member of the owning hospital.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  10485760, -- 10 MB, mirrors MAX_DOCUMENT_SIZE_BYTES in src/lib/patientDocuments.ts
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Object policies.
--
-- Object keys are {hospital_id}/{patient_id}/{document_id}/{file_name}.
-- storage.rules only compared the first segment to the caller's hospital; here
-- the second segment is checked against public.patients as well, so a blob
-- cannot be filed under another hospital's patient directory.
--
-- The patient lookup goes through a SECURITY DEFINER helper because storage
-- policies run as the caller and patients RLS is not meant to be re-entered
-- from the storage schema.
-- -----------------------------------------------------------------------------
create or replace function public.is_patient_document_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    array_length(storage.foldername(p_name), 1) = 4
    and (storage.foldername(p_name))[1] = public.current_hospital_id()::text
    and exists (
      select 1
      from public.patients p
      where p.id::text = (storage.foldername(p_name))[2]
        and p.hospital_id = public.current_hospital_id()
    );
$$;

revoke all on function public.is_patient_document_path(text) from public;
grant execute on function public.is_patient_document_path(text) to authenticated, service_role;

drop policy if exists "patient documents read own hospital" on storage.objects;
create policy "patient documents read own hospital"
  on storage.objects for select
  using (
    bucket_id = 'patient-documents'
    and public.is_patient_document_path(name)
  );

drop policy if exists "patient documents upload own hospital" on storage.objects;
create policy "patient documents upload own hospital"
  on storage.objects for insert
  with check (
    bucket_id = 'patient-documents'
    and public.is_patient_document_path(name)
  );

drop policy if exists "patient documents update own hospital" on storage.objects;
create policy "patient documents update own hospital"
  on storage.objects for update
  using (
    bucket_id = 'patient-documents'
    and public.is_patient_document_path(name)
  )
  with check (
    bucket_id = 'patient-documents'
    and public.is_patient_document_path(name)
  );

drop policy if exists "patient documents delete own hospital" on storage.objects;
create policy "patient documents delete own hospital"
  on storage.objects for delete
  using (
    bucket_id = 'patient-documents'
    and public.is_patient_document_path(name)
  );

-- -----------------------------------------------------------------------------
-- Auth: auto-create a profile row on signup.
--
-- Supabase, unlike Firebase, has no client-side "create the hospital then the
-- user doc" step available to anonymous callers, because RLS on hospitals
-- requires auth.uid() is not null. So registration is a two-phase flow:
--
--   1. supabase.auth.signUp(...)             -> creates the auth.users row
--   2. this trigger inserts hospitals + profiles, since the profile needs a
--      hospital_id the client cannot know before signing up.
--
-- Every signup provisions its own hospital, mirroring the old Firebase
-- registerWithEmail(), which called addDoc(collection(db, "hospitals")) and
-- therefore always produced a fresh tenant. The hospital name is deliberately
-- NOT deduplicated: matching on name would let anyone join an existing hospital
-- by typing its name during registration.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid;
  v_hospital_name text;
  v_name text;
  v_role user_role;
begin
  v_hospital_name := nullif(trim(new.raw_user_meta_data ->> 'hospital_name'), '');
  if v_hospital_name is null then
    v_hospital_name := 'My Hospital';
  end if;

  v_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');

  -- Validate the requested role against the enum. raw_user_meta_data is
  -- client-supplied, so an unknown value must fall back rather than abort the
  -- signup with an enum cast error.
  if nullif(new.raw_user_meta_data ->> 'role', '') in ('admin', 'doctor', 'nurse', 'receptionist') then
    v_role := (new.raw_user_meta_data ->> 'role')::user_role;
  else
    v_role := 'receptionist';
  end if;

  insert into public.hospitals (name, owner_id)
  values (v_hospital_name, new.id)
  returning id into v_hospital_id;

  insert into public.profiles (id, email, name, role, hospital_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(v_name, new.email, 'User'),
    v_role,
    v_hospital_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;