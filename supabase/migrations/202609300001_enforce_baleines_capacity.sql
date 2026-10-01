-- Prepared for review only. No backfill and no modification of existing bookings.
begin;

alter table public.reservations_baleines
  add column if not exists capacity_hold_expires_at timestamptz;

-- A real row write serializes each departure, including under repeatable read.
-- Advisory locks also cooperate with the existing Salon booking functions.
create table if not exists public.baleines_capacity_locks (
  date_sortie text not null,
  depart text not null,
  revision bigint not null default 0,
  primary key (date_sortie, depart)
);
alter table public.baleines_capacity_locks enable row level security;
revoke all on public.baleines_capacity_locks from public, anon, authenticated;

create or replace function public.baleines_consumes_capacity(
  p_status text, p_paid boolean, p_source text, p_hold timestamptz, p_now timestamptz
) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select case
    when lower(coalesce(p_status, '')) in
      ('cancelled','canceled','failed','refused','abandoned','unpaid') then false
    when p_paid is true or lower(coalesce(p_status, '')) in ('paid','paye','deposit_paid') then true
    when p_source = 'paiement_externe_a_facturer' then true
    when lower(coalesce(p_status, '')) = 'pending' then coalesce(p_hold > p_now, false)
    else false
  end;
$$;

-- Never undercount a legacy row if its stored totals and participant roles differ.
create or replace function public.baleines_capacity_counts(
  p_participants jsonb, p_water integer, p_observers integer
) returns table (water integer, observers integer)
language sql immutable set search_path = public, pg_temp as $$
  select greatest(coalesce(p_water, 0), count(*) filter (where value->>'role' = 'mise_eau')::integer),
         greatest(coalesce(p_observers, 0), count(*) filter (where value->>'role' = 'observateur')::integer)
  from jsonb_array_elements(case when jsonb_typeof(p_participants) = 'array' then p_participants else '[]'::jsonb end);
$$;

create or replace function public.enforce_baleines_capacity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_key record;
  v_old_date text;
  v_old_depart text;
  v_now timestamptz;
  v_water integer;
  v_observers integer;
  v_used_water bigint;
  v_used_observers bigint;
begin
  if tg_op = 'UPDATE' then
    -- Invoice/email updates must not acquire capacity again.
    if row(new.date_sortie,new.depart,new.participants::jsonb,new.nombre_mise_eau,
           new.nombre_observateurs,new.statut_paiement,new.paye,new.source_paiement,
           new.capacity_hold_expires_at)
       is not distinct from
       row(old.date_sortie,old.depart,old.participants::jsonb,old.nombre_mise_eau,
           old.nombre_observateurs,old.statut_paiement,old.paye,old.source_paiement,
           old.capacity_hold_expires_at) then
      return new;
    end if;
    v_old_date := old.date_sortie::text;
    v_old_depart := old.depart;
  end if;

  if new.date_sortie is null or new.depart is null or new.depart not in ('07:00','13:15') then
    raise exception 'Date ou depart Baleines invalide' using errcode = '22023';
  end if;

  -- Lock old and new departure in a stable order when a reservation moves.
  for v_key in
    select distinct d, s from (values (new.date_sortie::text,new.depart),(v_old_date,v_old_depart)) as keys(d,s)
    where d is not null and s is not null order by d,s
  loop
    perform pg_advisory_xact_lock(hashtextextended('baleines-capacity:' || v_key.d || ':' || v_key.s, 0));
    insert into public.baleines_capacity_locks(date_sortie,depart)
    values(v_key.d,v_key.s)
    on conflict(date_sortie,depart) do update
      set revision = baleines_capacity_locks.revision + 1;
  end loop;
  v_now := clock_timestamp();

  -- Only NEW online pending bookings get a finite seat hold. Existing pending
  -- rows are not backfilled or revived by unrelated updates.
  if tg_op = 'INSERT' and lower(coalesce(new.statut_paiement,'')) = 'pending'
     and new.paye is not true
     and new.source_paiement in ('payzen_baleines','payzen_baleines_salon_tourisme_public','carnet_baleines') then
    new.capacity_hold_expires_at := v_now + interval '30 minutes';
  end if;

  select water,observers into v_water,v_observers
  from public.baleines_capacity_counts(new.participants::jsonb,new.nombre_mise_eau,new.nombre_observateurs);

  if not public.baleines_consumes_capacity(new.statut_paiement,new.paye,new.source_paiement,
                                           new.capacity_hold_expires_at,v_now) then
    return new;
  end if;
  if coalesce(new.nombre_mise_eau,0) < 0 or coalesce(new.nombre_observateurs,0) < 0
     or v_water > 6 or v_observers > 2 then
    raise exception 'Capacite Baleines insuffisante pour ce depart' using errcode = 'PBC01';
  end if;

  -- This runs AFTER the lock is acquired, with a fresh READ COMMITTED snapshot.
  select coalesce(sum(c.water),0),coalesce(sum(c.observers),0)
    into v_used_water,v_used_observers
  from public.reservations_baleines r
  cross join lateral public.baleines_capacity_counts(r.participants::jsonb,r.nombre_mise_eau,r.nombre_observateurs) c
  where r.date_sortie = new.date_sortie and r.depart = new.depart
    and r.id is distinct from new.id
    and public.baleines_consumes_capacity(r.statut_paiement,r.paye,r.source_paiement,r.capacity_hold_expires_at,v_now);

  if v_used_water + v_water > 6 or v_used_observers + v_observers > 2 then
    raise exception 'Capacite Baleines insuffisante pour ce depart' using errcode = 'PBC01';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_baleines_capacity on public.reservations_baleines;
create trigger enforce_baleines_capacity
before insert or update on public.reservations_baleines
for each row execute function public.enforce_baleines_capacity();

-- Public reads return aggregate counts only, using exactly the enforcement rule.
create or replace function public.get_baleines_capacity(p_from date, p_to date)
returns table (date_sortie text, depart text, mise_eau bigint, observateurs bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 31 then
    raise exception 'Periode Baleines invalide' using errcode = '22023';
  end if;
  return query
    select r.date_sortie::text,r.depart,sum(c.water),sum(c.observers)
    from public.reservations_baleines r
    cross join lateral public.baleines_capacity_counts(r.participants::jsonb,r.nombre_mise_eau,r.nombre_observateurs) c
    where r.date_sortie >= p_from::text and r.date_sortie <= p_to::text
      and public.baleines_consumes_capacity(r.statut_paiement,r.paye,r.source_paiement,
                                            r.capacity_hold_expires_at,statement_timestamp())
    group by r.date_sortie,r.depart;
end;
$$;

-- Service-only insertion; pricing stays in the existing API.
-- The trigger enforces the same invariant on admin/direct inserts and updates.
create or replace function public.create_baleines_reservation(p_reservation jsonb)
returns table (id uuid, montant_total integer, source_paiement text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_participants jsonb := p_reservation->'participants';
  v_water integer;
  v_observers integer;
begin
  if jsonb_typeof(v_participants) is distinct from 'array' then
    raise exception 'Participants Baleines invalides' using errcode = '22023';
  end if;
  select count(*) filter (where value->>'role' = 'mise_eau'),
         count(*) filter (where value->>'role' = 'observateur')
    into v_water,v_observers from jsonb_array_elements(v_participants);
  if v_water + v_observers < 1 or v_water + v_observers <> jsonb_array_length(v_participants)
     or v_water > 6 or v_observers > 2
     or coalesce(p_reservation->>'source_paiement','') not in ('payzen_baleines','payzen_baleines_salon_tourisme_public') then
    raise exception 'Reservation Baleines invalide' using errcode = '22023';
  end if;
  return query
    insert into public.reservations_baleines as r
      (date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,
       participants,nombre_mise_eau,nombre_observateurs,montant_total,devise,statut_paiement,paye,source_paiement)
    values ((p_reservation->>'date_sortie')::date::text,p_reservation->>'depart',
      p_reservation->>'responsable_prenom',p_reservation->>'responsable_nom',
      p_reservation->>'responsable_email',p_reservation->>'responsable_telephone',
      v_participants,v_water,v_observers,(p_reservation->>'montant_total')::integer,
      'XPF','pending',false,p_reservation->>'source_paiement')
    returning r.id,r.montant_total::integer,r.source_paiement;
end;
$$;

revoke all on function public.baleines_consumes_capacity(text,boolean,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.baleines_capacity_counts(jsonb,integer,integer) from public,anon,authenticated;
revoke all on function public.enforce_baleines_capacity() from public,anon,authenticated;
revoke all on function public.get_baleines_capacity(date,date) from public,anon,authenticated;
grant execute on function public.get_baleines_capacity(date,date) to anon,authenticated,service_role;
revoke all on function public.create_baleines_reservation(jsonb) from public,anon,authenticated;
grant execute on function public.create_baleines_reservation(jsonb) to service_role;
commit;
