-- =============================================================================
-- CardEase — notify administrators when a new member joins
--
-- Invitations were recorded and redeemed (handle_new_user() creates the profile
-- and stamps hospital_invites.accepted_at) but nobody was told about it. The
-- "team member joined" event happens inside the signup trigger, where there is
-- NO authenticated session, so public.notify_hospital() cannot be used: it
-- derives the hospital from auth.uid(), which is null at that point.
--
-- A trigger on public.profiles after insert is used instead. It reaches exactly
-- the same audience as the other team notifications (the hospital's admins) and
-- honours each recipient's team_events preference. For a self-service signup the
-- only member is the new administrator, who is excluded, so nothing is sent.
-- =============================================================================

create or replace function public.notify_profile_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_label text;
begin
  -- Only announce a join when there is somebody else to tell. A brand-new
  -- hospital's founder would otherwise be the only recipient.
  if not exists (
    select 1
    from public.profiles
    where hospital_id = new.hospital_id
      and id <> new.id
  ) then
    return new;
  end if;

  v_role_label := case new.role
    when 'admin' then 'an administrator'
    when 'doctor' then 'a doctor'
    when 'nurse' then 'a nurse'
    when 'receptionist' then 'a receptionist'
    else 'a team member'
  end;

  insert into public.notifications (hospital_id, recipient_id, actor_id, type, title, description, link)
  select
    new.hospital_id,
    p.id,
    new.id,
    'team',
    'New team member joined',
    new.name || ' joined as ' || v_role_label,
    '/settings/team'
  from public.profiles p
  left join public.notification_preferences pref on pref.user_id = p.id
  where p.hospital_id = new.hospital_id
    and p.id <> new.id
    and p.role = 'admin'
    and coalesce(pref.team_events, true);

  return new;
end;
$$;

drop trigger if exists profiles_notify_created on public.profiles;
create trigger profiles_notify_created
  after insert on public.profiles
  for each row execute function public.notify_profile_created();

revoke all on function public.notify_profile_created() from public;
grant execute on function public.notify_profile_created() to authenticated, service_role;
