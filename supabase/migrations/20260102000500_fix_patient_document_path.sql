-- =============================================================================
-- CardEase — fix the patient document storage path guard
--
-- public.is_patient_document_path() originally checked
--   array_length(storage.foldername(name), 1) = 4
--
-- but storage.foldername() strips the file name. A key of the shape
--   {hospital_id}/{patient_id}/{document_id}/{file_name}
-- therefore yields only THREE folder segments, never four. The whole predicate
-- was false, so every policy on storage.objects for the patient-documents
-- bucket denied access and uploads failed with an RLS/permission error.
--
-- The hospital and patient segments are still validated below; only the segment
-- count is corrected.
-- =============================================================================

create or replace function public.is_patient_document_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    array_length(storage.foldername(p_name), 1) = 3
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
