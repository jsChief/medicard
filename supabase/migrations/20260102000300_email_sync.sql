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

-- profiles.email is only ever written by this trigger from here on, so a
-- client-supplied email would be silently overwritten and the two would race.
-- Deny the column explicitly rather than relying on the update policy.
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (email) on public.profiles from authenticated;

-- Backfill for any profile rows that drifted before this trigger existed.
update public.profiles p
   set email = coalesce(u.email, '')
  from auth.users u
 where u.id = p.id
   and p.email is distinct from coalesce(u.email, '');