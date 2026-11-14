-- =============================================================================
-- Order payments
--
-- Adds the money gate that sits beside the existing clinical approval gate:
--
--   * HMO visits      -> covered (the plan pays; approval still applies)
--   * private visits  -> unpaid until reception records payment
--   * external rx     -> waived (the hospital never collects for these)
--
-- Payment is deliberately kept OUT of order_status. order_status already
-- encodes clinical approval and drives deriveVisitStatus()/the check-out
-- blockers; folding money into it would make an unpaid order look "rejected"
-- and change the visit flow. Fulfilment/dispensing is blocked by a separate
-- trigger until the payment row is settled.
-- =============================================================================

-- The migration may be re-run after a partial failure (supabase records a
-- migration only once it completes), so guard the type creation.
do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where t.typname = 'payment_status'
       and n.nspname = 'public'
  ) then
    create type public.payment_status as enum ('unpaid', 'paid', 'covered', 'waived');
  end if;
end
$$;

alter table public.lab_orders
  add column if not exists payment_status    public.payment_status not null default 'unpaid',
  add column if not exists amount            numeric(12,2),
  add column if not exists payment_reference text not null default '',
  add column if not exists paid_at           timestamptz,
  add column if not exists paid_by           uuid references auth.users (id) on delete set null,
  add column if not exists paid_by_name      text not null default '',
  add column if not exists waiver_reason     text not null default '';

alter table public.prescriptions
  add column if not exists payment_status    public.payment_status not null default 'unpaid',
  add column if not exists amount            numeric(12,2),
  add column if not exists payment_reference text not null default '',
  add column if not exists paid_at           timestamptz,
  add column if not exists paid_by           uuid references auth.users (id) on delete set null,
  add column if not exists paid_by_name      text not null default '',
  add column if not exists waiver_reason     text not null default '';

create index if not exists lab_orders_hosp_payment_idx
  on public.lab_orders (hospital_id, payment_status);
create index if not exists prescriptions_hosp_payment_idx
  on public.prescriptions (hospital_id, payment_status);

-- Backfill existing rows. Private rows stay 'unpaid', which is correct: they
-- have not been paid through this system yet. Existing HMO rows were already
-- treated as approved/covered, and external prescriptions are waived.
update public.lab_orders o
set payment_status = 'covered'::public.payment_status
from public.visits v
where v.id = o.visit_id
  and v.payer_type = 'hmo';

update public.prescriptions p
set payment_status = case
      when p.destination = 'external' then 'waived'::public.payment_status
      else 'covered'::public.payment_status
    end,
    waiver_reason  = case when p.destination = 'external' then 'External pharmacy' else '' end
from public.visits v
where v.id = p.visit_id
  and v.payer_type = 'hmo';

update public.prescriptions p
set payment_status = 'waived'::public.payment_status,
    waiver_reason  = 'External pharmacy'
where p.destination = 'external'
  and p.payment_status <> 'waived';

-- =============================================================================
-- Insert defaults
--
-- Re-assert the payer/destination rule even when the client sends a payment
-- status: a private order must not be born paid, and an HMO order must not be
-- born unpaid. paid_* fields are cleared on insert because money is only ever
-- recorded through the RPC below (or by the service role).
-- =============================================================================
create or replace function public.apply_order_payment_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_payer public.payer_type;
begin
  select v.payer_type
    into v_payer
    from public.visits v
   where v.id = new.visit_id;

  if tg_table_name = 'prescriptions'
     and (to_jsonb(new) ->> 'destination') = 'external' then
    new.payment_status := 'waived'::public.payment_status;
    new.waiver_reason  := 'External pharmacy';
  elsif v_payer = 'hmo' then
    new.payment_status := 'covered'::public.payment_status;
    new.waiver_reason  := '';
  else
    new.payment_status := 'unpaid'::public.payment_status;
    new.waiver_reason  := '';
  end if;

  new.paid_at        := null;
  new.paid_by        := null;
  new.paid_by_name   := '';
  new.payment_reference := '';

  return new;
end;
$$;

drop trigger if exists lab_orders_apply_payment_defaults on public.lab_orders;
create trigger lab_orders_apply_payment_defaults
  before insert on public.lab_orders
  for each row execute function public.apply_order_payment_defaults();

drop trigger if exists prescriptions_apply_payment_defaults on public.prescriptions;
create trigger prescriptions_apply_payment_defaults
  before insert on public.prescriptions
  for each row execute function public.apply_order_payment_defaults();

-- =============================================================================
-- Payment authority
--
-- RLS is hospital-scoped, not role-scoped, so without this any authenticated
-- colleague could edit the payment columns directly. The RPC is the supported
-- path; this trigger closes the direct-write hole.
-- =============================================================================
create or replace function public.enforce_order_payment_authority()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if new.payment_status     is not distinct from old.payment_status
     and new.amount            is not distinct from old.amount
     and new.payment_reference is not distinct from old.payment_reference
     and new.paid_at           is not distinct from old.paid_at
     and new.paid_by           is not distinct from old.paid_by
     and new.paid_by_name      is not distinct from old.paid_by_name
     and new.waiver_reason     is not distinct from old.waiver_reason then
    return new;
  end if;

  -- anon holds no grants on these tables, so a caller with no resolvable
  -- profile can only be the service role: trusted, let it through. An
  -- authenticated caller without a profile must fail closed (a NULL role in a
  -- NOT IN comparison would otherwise evaluate to NULL and skip the raise).
  v_role := public.current_user_role();
  if v_role is null then
    if auth.uid() is null then
      return new;
    end if;
    raise exception 'Only reception or an admin can record payments.' using errcode = '42501';
  end if;

  if v_role not in ('admin', 'receptionist') then
    raise exception 'Only reception or an admin can record payments.' using errcode = '42501';
  end if;

  if new.payment_status = 'waived' and v_role <> 'admin' then
    raise exception 'Only an admin can waive a payment.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists lab_orders_payment_authority on public.lab_orders;
create trigger lab_orders_payment_authority
  before update of status, payment_status, amount, payment_reference, paid_at, paid_by, paid_by_name, waiver_reason
  on public.lab_orders
  for each row execute function public.enforce_order_payment_authority();

drop trigger if exists prescriptions_payment_authority on public.prescriptions;
create trigger prescriptions_payment_authority
  before update of status, payment_status, amount, payment_reference, paid_at, paid_by, paid_by_name, waiver_reason
  on public.prescriptions
  for each row execute function public.enforce_order_payment_authority();

-- =============================================================================
-- Fulfilment gate
--
-- Lab work starts only after money is settled, and medication is dispensed only
-- after it is settled. HMO approval remains a separate, first-class gate:
-- 'covered' satisfies money, not approval.
-- =============================================================================
create or replace function public.enforce_order_payment_gate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Sending a prescription to an external pharmacy is a hand-off, not a sale:
  -- the hospital does not collect, so it settles as waived. This also covers a
  -- prescription that was created in-house and later redirected. An order that
  -- was already paid keeps its payment record; a refund is a separate action.
  if tg_table_name = 'prescriptions'
     and new.status = 'external'
     and new.payment_status = 'unpaid' then
    new.payment_status := 'waived'::public.payment_status;
    new.waiver_reason  := coalesce(nullif(new.waiver_reason, ''), 'External pharmacy');
  end if;

  if new.status in ('fulfilled', 'dispensed')
     and old.status is distinct from new.status
     and new.payment_status = 'unpaid' then
    raise exception
      'This request has not been paid for. Reception must record payment or the plan must cover it before it can be fulfilled.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists lab_orders_payment_gate on public.lab_orders;
create trigger lab_orders_payment_gate
  before update of status on public.lab_orders
  for each row execute function public.enforce_order_payment_gate();

drop trigger if exists prescriptions_payment_gate on public.prescriptions;
create trigger prescriptions_payment_gate
  before update of status on public.prescriptions
  for each row execute function public.enforce_order_payment_gate();

-- =============================================================================
-- record_order_payment()
--
-- One atomic write for "take payment" and "waive". SECURITY DEFINER so the
-- actor identity is still auth.uid() (current_user_role() reads profiles) while
-- the update is not limited by the generic hospital-scoped UPDATE policy.
-- =============================================================================
create or replace function public.record_order_payment(
  p_kind      text,
  p_id        uuid,
  p_amount    numeric,
  p_reference text,
  p_waive     boolean,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role        public.user_role := public.current_user_role();
  v_hospital    uuid := public.current_hospital_id();
  v_order_hosp  uuid;
  v_status      public.payment_status;
  v_order_state public.order_status;
  v_actor_name  text;
begin
  if p_kind not in ('lab', 'prescription') then
    raise exception 'Unknown order kind: %', p_kind using errcode = '22023';
  end if;

  if v_role is null then
    if auth.uid() is not null then
      raise exception 'Only reception or an admin can record payments.' using errcode = '42501';
    end if;
    -- else: service role, a trusted backend job.
  elsif v_role not in ('admin', 'receptionist') then
    raise exception 'Only reception or an admin can record payments.' using errcode = '42501';
  end if;

  if p_waive and v_role is not null and v_role <> 'admin' then
    raise exception 'Only an admin can waive a payment.' using errcode = '42501';
  end if;

  if p_waive and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to waive a payment.' using errcode = '22023';
  end if;

  if p_amount is not null and p_amount < 0 then
    raise exception 'A payment amount cannot be negative.' using errcode = '22023';
  end if;

  if p_kind = 'lab' then
    select o.hospital_id, o.payment_status, o.status
      into v_order_hosp, v_status, v_order_state
      from public.lab_orders o
     where o.id = p_id
       for update;
  else
    select p.hospital_id, p.payment_status, p.status
      into v_order_hosp, v_status, v_order_state
      from public.prescriptions p
     where p.id = p_id
       for update;
  end if;

  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;

  if v_hospital is null or v_order_hosp is distinct from v_hospital then
    raise exception 'That request belongs to another hospital.' using errcode = '42501';
  end if;

  if v_order_state in ('rejected', 'cancelled', 'fulfilled', 'dispensed', 'external') then
    raise exception 'This request is no longer payable.' using errcode = '22023';
  end if;

  if v_status = 'covered' then
    raise exception 'This request is already covered by the plan.' using errcode = '22023';
  end if;

  if v_status in ('paid', 'waived') then
    raise exception 'This request is already settled.' using errcode = '22023';
  end if;

  select p.name into v_actor_name from public.profiles p where p.id = auth.uid();

  if p_kind = 'lab' then
    update public.lab_orders
       set payment_status    = case when p_waive then 'waived'::public.payment_status else 'paid'::public.payment_status end,
           amount            = p_amount,
           payment_reference = coalesce(p_reference, ''),
           paid_at           = now(),
           paid_by           = auth.uid(),
           paid_by_name      = coalesce(v_actor_name, ''),
           waiver_reason     = case when p_waive then trim(p_reason) else '' end
     where id = p_id;
  else
    update public.prescriptions
       set payment_status    = case when p_waive then 'waived'::public.payment_status else 'paid'::public.payment_status end,
           amount            = p_amount,
           payment_reference = coalesce(p_reference, ''),
           paid_at           = now(),
           paid_by           = auth.uid(),
           paid_by_name      = coalesce(v_actor_name, ''),
           waiver_reason     = case when p_waive then trim(p_reason) else '' end
     where id = p_id;
  end if;
end;
$$;

revoke all on function public.record_order_payment(text, uuid, numeric, text, boolean, text) from public;
grant execute on function public.record_order_payment(text, uuid, numeric, text, boolean, text)
  to authenticated, service_role;
