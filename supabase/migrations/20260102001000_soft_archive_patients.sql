-- =============================================================================
-- Soft archive for patients
--
-- Previously "archiving" inserted a denormalised copy into public.archives and
-- left the patients row untouched. That meant:
--   * the patient stayed in the active list and was re-archived on every sweep,
--     accumulating duplicate archive rows for the same MRN;
--   * restore_archive() INSERTed a brand new patient (new id, placeholder
--     gender/blood type/empty contact details) while the original was still
--     there, so restoring produced two copies of the same person.
--
-- public.archives is no longer written to. patients gains three nullable
-- columns instead, and archiving is a column write: nothing is duplicated,
-- nothing is lost, and restoring is a single update.
--
-- The old archives table is intentionally left in place — it still holds
-- records created before this migration and dropping it is a separate,
-- destructive decision.
-- =============================================================================

alter table public.patients
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists discharge_reason text not null default '';

comment on column public.patients.archived_at is
  'When the record was archived. NULL means the patient is active. '
  'Partial index + list queries filter on IS NULL, so the active list stays fast.';
comment on column public.patients.archived_by is
  'Display name of the staff member who archived the record. Text rather than a '
  'profiles FK so the archive listing can render it without an embedded join; '
  'the audit-critical identity is still available via updated_at.';
comment on column public.patients.discharge_reason is
  'Recorded at archive time. Previously this was faked from the clinical notes.';

-- Partial index: the hot path is "active patients for this hospital", which
-- never touches archived rows.
create index if not exists patients_archived_at_idx
  on public.patients (hospital_id, archived_at)
  where archived_at is not null;

create index if not exists patients_active_idx
  on public.patients (hospital_id, archived_at, last_visit desc)
  where archived_at is null;

-- -----------------------------------------------------------------------------
-- archive_patient — soft archive a single record.
--
-- SECURITY INVOKER so the patients RLS policy still decides the rows. Idempotent:
-- re-archiving an already-archived record is a no-op rather than a duplicate.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- restore_patient — bring an archived record back into the active list.
--
-- The clinical status is deliberately left untouched: restoring a record whose
-- status is 'discharged' should not silently mark the patient as active again.
-- -----------------------------------------------------------------------------
create or replace function public.restore_patient(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hospital uuid;
begin
  select hospital_id into v_hospital
  from public.patients
  where id = p_id;

  if not found then
    raise exception 'archive % not found', p_id
      using errcode = 'P0002';
  end if;

  if v_hospital is distinct from public.current_hospital_id() then
    raise exception 'cannot restore a patient in another hospital'
      using errcode = '42501';
  end if;

  update public.patients
  set archived_at      = null,
      archived_by      = null,
      discharge_reason = ''
  where id = p_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Backfill legacy archive rows into the soft-archive flag.
--
-- The archive screen now reads patients.archived_at, so any record already in
-- public.archives has to be migrated or it would silently disappear from the UI.
-- Matching is on (hospital_id, mrn): the legacy copy kept the MRN, and the
-- patient row was never deleted by the old archive path, so it should still be
-- there.
-- -----------------------------------------------------------------------------
update public.patients p
set archived_at      = a.archived_at,
    archived_by      = nullif(a.archived_by, ''),
    discharge_reason = a.discharge_reason
from public.archives a
where a.hospital_id = p.hospital_id
  and a.mrn = p.mrn
  and p.archived_at is null;

do $$
declare
  v_orphans integer;
begin
  select count(*) into v_orphans
  from public.archives a
  where not exists (
    select 1 from public.patients p
    where p.hospital_id = a.hospital_id and p.mrn = a.mrn
  );

  if v_orphans > 0 then
    raise notice
      'Soft archive: % legacy archive row(s) have no matching patient row and remain only in public.archives. They are no longer shown in the UI and can be dropped after review.',
      v_orphans;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function public.archive_patient(uuid, text, text) from public;
revoke execute on function public.restore_patient(uuid) from public;
grant execute on function public.archive_patient(uuid, text, text) to authenticated, service_role;
grant execute on function public.restore_patient(uuid) to authenticated, service_role;