-- =============================================================================
-- Keep public.profiles.email in sync with auth.users.email
-- =============================================================================
-- Email changes go through supabase.auth.updateUser({ email }), which writes
-- auth.users and (when "Confirm email" is enabled) mails a confirmation link to
-- the new address. The client must not write profiles.email itself:
--
--   * profiles.email would be updated before the new address is confirmed, so a
--     user who never clicks the link would be left with a profile claiming an
--     address they do not control, and one nobody can receive mail at.
--   * the two writes are not atomic, so a failure between them leaves the row
--     and the auth record permanently disagreeing.
--
-- auth.users is the authority, so mirror it with a trigger instead. SECURITY
-- DEFINER is required because auth.users is not readable by `authenticated`.
-- -----------------------------------------------------------------------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = coalesce(new.email, '')
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

revoke all on function public.sync_profile_email() from public;
grant execute on function public.sync_profile_email() to service_role;

-- profiles.email is now owned by this trigger, so the client must not be able
-- to write it. Postgres column privileges are ADDITIVE: a table-level UPDATE
-- grant covers every column, so `revoke update (email)` on its own would be a
-- no-op. The table-level grant has to go, and UPDATE re-granted per column.
--
-- The update policy itself stays as it was: a user may still edit their own
-- row, and RLS cannot express "but not this column".
revoke update on public.profiles from authenticated;
grant update (name, role, avatar) on public.profiles to authenticated;
grant update on public.profiles to service_role;

-- Backfill for any profile rows that drifted before this trigger existed.
update public.profiles p
   set email = coalesce(u.email, '')
  from auth.users u
 where u.id = p.id
   and p.email is distinct from coalesce(u.email, '');