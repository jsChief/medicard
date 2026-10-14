-- =============================================================================
-- CardEase — hospital team invitations
--
-- Multi-tenancy already shares data per hospital: every row carries a
-- hospital_id and RLS scopes it to public.current_hospital_id(). What was
-- missing was enrollment. handle_new_user() unconditionally provisioned a NEW
-- hospital for every signup, so a second colleague could never land in the
-- first one's tenant.
--
-- This migration adds the missing piece:
--   * public.hospital_invites — an admin records the email (+ role) they want
--     to add to their hospital.
--   * handle_new_user() is rewritten to attach an invited signup to the
--     INVITER's hospital and role instead of creating a stray tenant. The role
--     always comes from the invite row, never from client metadata.
--   * set_staff_role() / remove_staff() give admins a way to manage the team,
--     because the profiles RLS policies only let a user touch their own row and
--     profiles.role is deliberately absent from the authenticated UPDATE grant
--     (see 20260102000400_restrict_profile_role.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- hospital_invites
--
-- Keyed by (hospital_id, lower-cased email): an email can be pending in more
-- than one hospital, but only once per hospital. accepted_at is stamped by the
-- signup trigger; rows are kept (not deleted) so the history survives.
-- -----------------------------------------------------------------------------
create table public.hospital_invites (
  id           uuid primary key default gen_random_uuid(),
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  email        text not null,
  role         user_role not null default 'receptionist',
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.hospital_invites is
  'Pending invitations that attach a new auth user to an existing hospital at signup.';

-- Email is stored lower-cased (enforced by the trigger below) so this plain
-- unique constraint is also the case-insensitive one, and PostgREST's upsert
-- (on_conflict=hospital_id,email) can match it. An expression index on
-- lower(email) would NOT satisfy an ON CONFLICT (hospital_id, email) clause.
alter table public.hospital_invites
  add constraint hospital_invites_hospital_email_key unique (hospital_id, email);

create index hospital_invites_email_idx
  on public.hospital_invites (lower(email));

create or replace function public.normalize_invite_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger hospital_invites_normalize_email
  before insert or update on public.hospital_invites
  for each row execute function public.normalize_invite_email();

alter table public.hospital_invites enable row level security;

-- Only admins of the inviting hospital can see or manage its invites. The
-- trigger reads the table as its owner (SECURITY DEFINER), so it bypasses RLS.
drop policy if exists "hospital invites select admins" on public.hospital_invites;
create policy "hospital invites select admins"
  on public.hospital_invites for select
  using (hospital_id = public.current_hospital_id() and public.is_admin());

drop policy if exists "hospital invites insert admins" on public.hospital_invites;
create policy "hospital invites insert admins"
  on public.hospital_invites for insert
  with check (
    hospital_id = public.current_hospital_id()
    and public.is_admin()
    and invited_by = auth.uid()
  );

drop policy if exists "hospital invites update admins" on public.hospital_invites;
create policy "hospital invites update admins"
  on public.hospital_invites for update
  using (hospital_id = public.current_hospital_id() and public.is_admin())
  with check (hospital_id = public.current_hospital_id() and public.is_admin());

drop policy if exists "hospital invites delete admins" on public.hospital_invites;
create policy "hospital invites delete admins"
  on public.hospital_invites for delete
  using (hospital_id = public.current_hospital_id() and public.is_admin());

grant select, insert, update, delete on public.hospital_invites to authenticated, service_role;
revoke all on public.hospital_invites from anon;

-- -----------------------------------------------------------------------------
-- has_pending_invite(email) — lets the registration form sanity-check the
-- "join a team" path BEFORE calling auth.signUp(). Without it the only signal
-- is GoTrue's opaque "Database error saving new user", because it masks errors
-- raised from the auth.users trigger.
--
-- Granted to anon because the caller is not signed in yet. It reveals only
-- whether an address has a live invite somewhere; it never returns the hospital
-- or the role.
-- -----------------------------------------------------------------------------
create or replace function public.has_pending_invite(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hospital_invites
    where lower(email) = lower(coalesce(p_email, ''))
      and accepted_at is null
      and expires_at > now()
  );
$$;

revoke all on function public.has_pending_invite(text) from public;
grant execute on function public.has_pending_invite(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- set_staff_role(user, role) — admin-only role change.
--
-- SECURITY DEFINER because the profiles UPDATE policy is `auth.uid() = id` and
-- the authenticated role has no UPDATE grant on the role column. Guard rails:
-- the caller must be an admin, the target must live in the caller's hospital,
-- and an admin cannot change their own role (so a hospital can never be left
-- without an administrator by accident).
-- -----------------------------------------------------------------------------
create or replace function public.set_staff_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles.' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  update public.profiles
     set role = p_role
   where id = p_user_id
     and hospital_id = public.current_hospital_id();

  if not found then
    raise exception 'That person is not a member of your hospital.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.set_staff_role(uuid, user_role) from public;
grant execute on function public.set_staff_role(uuid, user_role) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- remove_staff(user) — admin-only removal from the hospital.
--
-- Deletes the profile row, which is what the app treats as membership: the
-- user's session no longer resolves to a profile, so they are treated as signed
-- out and lose all access. The auth.users row is left in place, so their email
-- cannot be re-registered by someone else; because a fresh signup is therefore
-- impossible, re-adding them requires manual database work. Treat removal as a
-- last resort — deactivation via an is_active flag is a planned follow-up.
-- -----------------------------------------------------------------------------
create or replace function public.remove_staff(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can remove staff.' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself.' using errcode = '42501';
  end if;

  delete from public.profiles
   where id = p_user_id
     and hospital_id = public.current_hospital_id();

  if not found then
    raise exception 'That person is not a member of your hospital.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.remove_staff(uuid) from public;
grant execute on function public.remove_staff(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Auth: rewritten signup trigger.
--
-- Branches, in priority order:
--   1. A live invite for this email  -> join the inviter's hospital with the
--      inviter's chosen role. The invite always wins, so a colleague who picks
--      "create a new organization" by mistake still lands in the right tenant
--      instead of forking a duplicate.
--   2. intent = 'join' but no invite -> abort. Without this the signup would
--      silently provision a brand-new hospital the user never asked for.
--   3. Otherwise                     -> self-service tenancy: create a hospital
--      and make its creator the admin/owner, so they can invite everyone else.
--
-- raw_user_meta_data is client-supplied, so it is only ever trusted for the
-- display name and the free-text hospital name (which is never matched on).
-- Role is NEVER read from it.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.hospital_invites%rowtype;
  v_hospital_id uuid;
  v_hospital_name text;
  v_name text;
  v_intent text;
begin
  v_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  v_intent := new.raw_user_meta_data ->> 'intent';

  -- 1) Join an existing hospital when a valid invite exists.
  select *
    into v_invite
    from public.hospital_invites
   where lower(email) = lower(coalesce(new.email, ''))
     and accepted_at is null
     and expires_at > now()
   order by created_at desc
   limit 1;

  if found then
    insert into public.profiles (id, email, name, role, hospital_id)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(v_name, new.email, 'User'),
      v_invite.role,
      v_invite.hospital_id
    )
    on conflict (id) do nothing;

    update public.hospital_invites
       set accepted_at = now()
     where id = v_invite.id;

    return new;
  end if;

  -- 2) Explicitly joining, but nothing to join. Abort the whole signup.
  if v_intent = 'join' then
    raise exception 'No invitation was found for this email address.';
  end if;

  -- 3) Self-service tenancy: provision a new hospital. The creator is its admin
  --    and owner so the Team page is usable immediately.
  v_hospital_name := nullif(trim(new.raw_user_meta_data ->> 'hospital_name'), '');
  if v_hospital_name is null then
    v_hospital_name := 'My Hospital';
  end if;

  insert into public.hospitals (name, owner_id)
  values (v_hospital_name, new.id)
  returning id into v_hospital_id;

  insert into public.profiles (id, email, name, role, hospital_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(v_name, new.email, 'User'),
    'admin',
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
