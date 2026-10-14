-- =============================================================================
-- CardEase — in-app notifications
--
-- Replaces the hard-coded notification list that used to live in
-- DashboardLayout. Notifications are per-recipient rows; the client never
-- inserts them directly, it goes through the SECURITY DEFINER functions below,
-- so a member of one hospital can never write into another hospital's inbox.
--
-- Live updates are delivered over Supabase Realtime (the table is added to the
-- supabase_realtime publication at the bottom of this file).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum. Mirrors the client's notification categories and the preference
-- columns a user can mute.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'patient',
      'team',
      'checkout',
      'announcement',
      'system'
    );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  -- Who triggered the event. Null for system rows.
  actor_id     uuid references auth.users (id) on delete set null,
  type         public.notification_type not null default 'system',
  title        text not null,
  description  text not null default '',
  -- Optional in-app deep link, e.g. /patients/<uuid>.
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.notifications is
  'Per-user in-app notifications. Rows are only created by notify_hospital()/announce_to_hospital().';

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_hospital_idx
  on public.notifications (hospital_id);

alter table public.notifications enable row level security;

-- A user may only ever see and manage their own inbox. There is deliberately no
-- INSERT policy: creation is funnelled through the SECURITY DEFINER functions.
drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications
  for delete using (recipient_id = auth.uid());

-- -----------------------------------------------------------------------------
-- notification_preferences — one row per user; users mute whole categories.
-- Defaults to auth.uid() so the client can upsert without knowing its own id.
-- -----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  patient_events   boolean not null default true,
  team_events      boolean not null default true,
  checkout_events  boolean not null default true,
  announcements    boolean not null default true,
  updated_at       timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-user category switches. Missing row = all categories enabled.';

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences select own" on public.notification_preferences;
create policy "notification_preferences select own" on public.notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists "notification_preferences insert own" on public.notification_preferences;
create policy "notification_preferences insert own" on public.notification_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists "notification_preferences update own" on public.notification_preferences;
create policy "notification_preferences update own" on public.notification_preferences
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notify_hospital — fan a notification out to the caller's hospital.
--
-- SECURITY DEFINER so it can insert into other users' inboxes, but it resolves
-- the hospital from the caller's own profile (never from an argument), so it
-- cannot be pointed at another tenant. Optional role filter and an
-- exclude-the-actor switch keep "someone else did X" semantics.
-- Returns the number of rows created.
-- -----------------------------------------------------------------------------
create or replace function public.notify_hospital(
  p_type          public.notification_type,
  p_title         text,
  p_description   text,
  p_link          text default null,
  p_exclude_actor boolean default true,
  p_roles         public.user_role[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital uuid := public.current_hospital_id();
  v_actor    uuid := auth.uid();
  v_count    integer;
begin
  if v_hospital is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'a notification title is required';
  end if;

  insert into public.notifications (hospital_id, recipient_id, actor_id, type, title, description, link)
  select
    p.hospital_id,
    p.id,
    v_actor,
    p_type,
    p_title,
    coalesce(p_description, ''),
    p_link
  from public.profiles p
  left join public.notification_preferences pref on pref.user_id = p.id
  where p.hospital_id = v_hospital
    and (not p_exclude_actor or p.id <> v_actor)
    and (p_roles is null or p.role = any (p_roles))
    and case p_type
          when 'patient'      then coalesce(pref.patient_events, true)
          when 'team'         then coalesce(pref.team_events, true)
          when 'checkout'     then coalesce(pref.checkout_events, true)
          when 'announcement' then coalesce(pref.announcements, true)
          else true
        end;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- announce_to_hospital — admin broadcast. Same fan-out, admin-gated.
-- -----------------------------------------------------------------------------
create or replace function public.announce_to_hospital(
  p_title       text,
  p_description text,
  p_link        text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only administrators can send announcements' using errcode = '42501';
  end if;

  return public.notify_hospital('announcement', p_title, p_description, p_link, true, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants. RLS still decides which rows the direct table ops touch.
-- -----------------------------------------------------------------------------
grant select, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

revoke execute on function public.notify_hospital(public.notification_type, text, text, text, boolean, public.user_role[]) from public;
revoke execute on function public.announce_to_hospital(text, text, text) from public;
grant execute on function public.notify_hospital(public.notification_type, text, text, text, boolean, public.user_role[]) to authenticated, service_role;
grant execute on function public.announce_to_hospital(text, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime. Guarded so re-running the migration is harmless.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
