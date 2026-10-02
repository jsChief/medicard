-- =============================================================================
-- Medicard — transactional write functions
--
-- A Firestore patient document held emergencyContacts and insurance nested
-- inside the single patient object, so one setDoc() was atomic. Postgres
-- splits those into child tables, so multi-row writes now need a transaction.
-- These functions give the client the same all-or-nothing guarantee.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- create_patient — insert patient + emergency contacts + insurance atomically.
-- `payload` is a jsonb blob matching the client-side Patient shape:
--   { patient: {...}, emergencyContacts: [...], insurance: {...} }
-- -----------------------------------------------------------------------------
create or replace function public.create_patient(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_patient jsonb := payload -> 'patient';
  v_hospital uuid := (v_patient ->> 'hospitalId')::uuid;
  v_id uuid;
begin
  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot create a patient for another hospital'
      using errcode = '42501';
  end if;

  insert into public.patients (
    mrn, first_name, last_name, middle_name, dob, gender, phone, email,
    address, city, state, postal_code, country, blood_type, marital_status,
    occupation, nationality, conditions, medications, allergies, surgeries,
    family_history, immunizations, notes, attending_physician, department,
    status, admission_date, last_visit, room, bed, hospital_id, created_by
  )
  values (
    v_patient ->> 'mrn',
    v_patient ->> 'firstName',
    v_patient ->> 'lastName',
    v_patient ->> 'middleName',
    (v_patient ->> 'dob')::date,
    (v_patient ->> 'gender')::patient_gender,
    coalesce(v_patient ->> 'phone', ''),
    v_patient ->> 'email',
    coalesce(v_patient ->> 'address', ''),
    coalesce(v_patient ->> 'city', ''),
    coalesce(v_patient ->> 'state', ''),
    coalesce(v_patient ->> 'postalCode', ''),
    coalesce(v_patient ->> 'country', ''),
    coalesce((v_patient ->> 'bloodType')::blood_type, 'Unknown'::blood_type),
    coalesce((v_patient ->> 'maritalStatus')::marital_status, 'other'::marital_status),
    v_patient ->> 'occupation',
    v_patient ->> 'nationality',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'conditions')), '{}'::text[]),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'medications')), '{}'::text[]),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'allergies')), '{}'::text[]),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'surgeries')), '{}'::text[]),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'familyHistory')), '{}'::text[]),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(v_patient -> 'immunizations')), '{}'::text[]),
    v_patient ->> 'notes',
    coalesce(v_patient ->> 'attendingPhysician', ''),
    coalesce(v_patient ->> 'department', ''),
    coalesce((v_patient ->> 'status')::patient_status, 'active'::patient_status),
    coalesce((v_patient ->> 'admissionDate')::timestamptz, now()),
    coalesce((v_patient ->> 'lastVisit')::timestamptz, now()),
    v_patient ->> 'room',
    v_patient ->> 'bed',
    v_hospital,
    auth.uid()
  )
  returning id into v_id;

  -- Emergency contacts
  insert into public.emergency_contacts (
    patient_id, name, relationship, phone, email, address, is_primary, hospital_id
  )
  select
    v_id,
    c ->> 'name',
    coalesce(c ->> 'relationship', ''),
    coalesce(c ->> 'phone', ''),
    c ->> 'email',
    c ->> 'address',
    coalesce((c ->> 'isPrimary')::boolean, false),
    v_hospital
  from jsonb_array_elements(coalesce(payload -> 'emergencyContacts', '[]'::jsonb)) as c;

  -- Insurance
  insert into public.patient_insurance (
    patient_id, provider, policy_number, group_number, member_id, plan_type,
    effective_date, expiry_date, copay_amount, deductible_amount,
    coverage_notes, has_secondary, secondary_provider, secondary_policy_number,
    hospital_id
  )
  values (
    v_id,
    coalesce(payload #>> '{insurance,provider}', ''),
    coalesce(payload #>> '{insurance,policyNumber}', ''),
    nullif(payload #>> '{insurance,groupNumber}', ''),
    nullif(payload #>> '{insurance,memberId}', ''),
    coalesce((payload #>> '{insurance,planType}')::insurance_plan, 'HMO'::insurance_plan),
    nullif(payload #>> '{insurance,effectiveDate}', '')::date,
    nullif(payload #>> '{insurance,expiryDate}', '')::date,
    nullif(payload #>> '{insurance,copayAmount}', ''),
    nullif(payload #>> '{insurance,deductibleAmount}', ''),
    nullif(payload #>> '{insurance,coverageNotes}', ''),
    coalesce((payload #>> '{insurance,secondaryInsurance}')::boolean, false),
    nullif(payload #>> '{insurance,secondaryProvider}', ''),
    nullif(payload #>> '{insurance,secondaryPolicyNumber}', ''),
    v_hospital
  );

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- update_patient — patch the patient row, then replace the child rows.
-- Keys present in `payload` overwrite; child collections are replaced wholesale
-- when the corresponding key is present.
-- -----------------------------------------------------------------------------
create or replace function public.update_patient(p_id uuid, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hospital uuid;
begin
  select hospital_id into v_hospital from public.patients where id = p_id;

  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot update a patient in another hospital'
      using errcode = '42501';
  end if;

  update public.patients p
  set
    mrn                 = coalesce(payload ->> 'mrn', p.mrn),
    first_name          = coalesce(payload ->> 'firstName', p.first_name),
    last_name           = coalesce(payload ->> 'lastName', p.last_name),
    middle_name         = coalesce(payload ->> 'middleName', p.middle_name),
    dob                 = coalesce((payload ->> 'dob')::date, p.dob),
    gender              = coalesce((payload ->> 'gender')::patient_gender, p.gender),
    phone               = coalesce(payload ->> 'phone', p.phone),
    email               = coalesce(payload ->> 'email', p.email),
    address             = coalesce(payload ->> 'address', p.address),
    city                = coalesce(payload ->> 'city', p.city),
    state               = coalesce(payload ->> 'state', p.state),
    postal_code         = coalesce(payload ->> 'postalCode', p.postal_code),
    country             = coalesce(payload ->> 'country', p.country),
    blood_type          = coalesce((payload ->> 'bloodType')::blood_type, p.blood_type),
    marital_status      = coalesce((payload ->> 'maritalStatus')::marital_status, p.marital_status),
    occupation          = coalesce(payload ->> 'occupation', p.occupation),
    nationality         = coalesce(payload ->> 'nationality', p.nationality),
    conditions          = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'conditions')), p.conditions),
    medications         = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'medications')), p.medications),
    allergies           = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'allergies')), p.allergies),
    surgeries           = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'surgeries')), p.surgeries),
    family_history      = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'familyHistory')), p.family_history),
    immunizations       = coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload -> 'immunizations')), p.immunizations),
    notes               = coalesce(payload ->> 'notes', p.notes),
    attending_physician = coalesce(payload ->> 'attendingPhysician', p.attending_physician),
    department          = coalesce(payload ->> 'department', p.department),
    status              = coalesce((payload ->> 'status')::patient_status, p.status),
    admission_date      = coalesce((payload ->> 'admissionDate')::timestamptz, p.admission_date),
    last_visit          = coalesce((payload ->> 'lastVisit')::timestamptz, p.last_visit),
    room                = coalesce(payload ->> 'room', p.room),
    bed                 = coalesce(payload ->> 'bed', p.bed)
  where p.id = p_id;

  -- Replace emergency contacts only when the caller supplied them.
  if payload ? 'emergencyContacts' then
    delete from public.emergency_contacts where patient_id = p_id;

    insert into public.emergency_contacts (
      patient_id, name, relationship, phone, email, address, is_primary, hospital_id
    )
    select
      p_id,
      c ->> 'name',
      coalesce(c ->> 'relationship', ''),
      coalesce(c ->> 'phone', ''),
      c ->> 'email',
      c ->> 'address',
      coalesce((c ->> 'isPrimary')::boolean, false),
      v_hospital
    from jsonb_array_elements(coalesce(payload -> 'emergencyContacts', '[]'::jsonb)) as c;
  end if;

  if payload ? 'insurance' then
    insert into public.patient_insurance (
      patient_id, provider, policy_number, group_number, member_id, plan_type,
      effective_date, expiry_date, copay_amount, deductible_amount,
      coverage_notes, has_secondary, secondary_provider, secondary_policy_number,
      hospital_id
    )
    values (
      p_id,
      coalesce(payload #>> '{insurance,provider}', ''),
      coalesce(payload #>> '{insurance,policyNumber}', ''),
      nullif(payload #>> '{insurance,groupNumber}', ''),
      nullif(payload #>> '{insurance,memberId}', ''),
      coalesce((payload #>> '{insurance,planType}')::insurance_plan, 'HMO'::insurance_plan),
      nullif(payload #>> '{insurance,effectiveDate}', '')::date,
      nullif(payload #>> '{insurance,expiryDate}', '')::date,
      nullif(payload #>> '{insurance,copayAmount}', ''),
      nullif(payload #>> '{insurance,deductibleAmount}', ''),
      nullif(payload #>> '{insurance,coverageNotes}', ''),
      coalesce((payload #>> '{insurance,secondaryInsurance}')::boolean, false),
      nullif(payload #>> '{insurance,secondaryProvider}', ''),
      nullif(payload #>> '{insurance,secondaryPolicyNumber}', ''),
      v_hospital
    )
    on conflict (patient_id) do update set
      provider                = excluded.provider,
      policy_number           = excluded.policy_number,
      group_number            = excluded.group_number,
      member_id               = excluded.member_id,
      plan_type               = excluded.plan_type,
      effective_date          = excluded.effective_date,
      expiry_date             = excluded.expiry_date,
      copay_amount            = excluded.copay_amount,
      deductible_amount       = excluded.deductible_amount,
      coverage_notes          = excluded.coverage_notes,
      has_secondary           = excluded.has_secondary,
      secondary_provider      = excluded.secondary_provider,
      secondary_policy_number = excluded.secondary_policy_number;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- restore_archive — move an archived patient back into the patients table.
-- Mirrors restoreArchive() in the old Firestore data layer.
-- -----------------------------------------------------------------------------
create or replace function public.restore_archive(p_archive_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  a public.archives%rowtype;
  v_hospital uuid;
  v_id uuid;
  v_first text;
  v_rest text;
begin
  select * into a from public.archives where id = p_archive_id;
  if not found then
    raise exception 'archive % not found', p_archive_id;
  end if;

  v_hospital := a.hospital_id;

  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot restore an archive from another hospital'
      using errcode = '42501';
  end if;

  v_first := split_part(a.name, ' ', 1);
  v_rest  := trim(substr(a.name, length(v_first) + 1));

  insert into public.patients (
    mrn, first_name, last_name, dob, gender, phone, address, city, state,
    postal_code, country, blood_type, marital_status, conditions,
    attending_physician, department, status, admission_date, last_visit,
    hospital_id, created_by
  )
  values (
    a.mrn,
    nullif(v_first, ''),
    nullif(v_rest, ''),
    a.dob,
    'O'::patient_gender,
    '', '', '', '', '', '',
    'Unknown'::blood_type,
    'other'::marital_status,
    coalesce(a.conditions, '{}'::text[]),
    a.attending_physician,
    a.department,
    'active'::patient_status,
    a.admission_date,
    a.discharge_date,
    v_hospital,
    auth.uid()
  )
  returning id into v_id;

  delete from public.archives where id = p_archive_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants. Supabase grants usage to the anon/authenticated roles by default on
-- new tables, but be explicit so a manually-restricted project still works.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant execute on function public.create_patient(jsonb)  to authenticated;
grant execute on function public.update_patient(uuid, jsonb) to authenticated;
grant execute on function public.restore_archive(uuid) to authenticated;
grant execute on function public.current_hospital_id() to authenticated;
grant execute on function public.current_user_role()   to authenticated;
grant execute on function public.is_admin()            to authenticated;