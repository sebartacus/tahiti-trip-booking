alter table public.reservations_charter
  alter column responsable_email drop not null;

alter table public.reservations_charter
  drop constraint if exists reservations_charter_type_paiement_check;

alter table public.reservations_charter
  add constraint reservations_charter_type_paiement_check
    check (type_paiement in (
      'deposit', 'full', 'cash', 'check', 'bank_transfer', 'card_terminal'
    ));

alter table public.reservations_charter
  drop constraint if exists reservations_charter_statut_paiement_check;

alter table public.reservations_charter
  add constraint reservations_charter_statut_paiement_check
    check (statut_paiement in (
      'pending', 'paid', 'paye', 'cancelled', 'failed',
      'unpaid', 'deposit_paid'
    ));

alter table public.reservations_charter
  add column if not exists reservation_manuelle boolean not null default false;

create or replace function public.create_manual_charter_reservation(
  p_date_debut date,
  p_date_fin date,
  p_formule text,
  p_nombre_personnes integer,
  p_responsable_prenom text,
  p_responsable_nom text,
  p_responsable_email text,
  p_responsable_tel text,
  p_montant_total integer,
  p_montant_paye integer,
  p_montant_solde integer,
  p_type_paiement text,
  p_statut_paiement text,
  p_sunset_drink text,
  p_champagne_supplement boolean,
  p_sleeping_arrangement_accepted boolean,
  p_requested_slots jsonb
)
returns table (success boolean, reservation_id uuid, conflicts jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reservation_id uuid;
  v_requested_count integer;
  v_affected_count integer;
  v_conflicts jsonb := '[]'::jsonb;
  v_pair record;
begin
  if jsonb_typeof(p_requested_slots) is distinct from 'array'
     or jsonb_array_length(p_requested_slots) = 0 then
    raise exception 'Slots Charter invalides' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_requested_slots) requested(item)
    where coalesce(item ->> 'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or coalesce(item ->> 'slot', '') not in ('morning', 'afternoon')
  ) then
    raise exception 'Slots Charter invalides' using errcode = '22023';
  end if;

  select count(*) into v_requested_count
  from jsonb_array_elements(p_requested_slots);

  for v_pair in
    select (item ->> 'date')::date requested_date, item ->> 'slot' requested_slot
    from jsonb_array_elements(p_requested_slots) requested(item)
    order by requested_date, requested_slot
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'boat_calendar_slots:' || v_pair.requested_date::text || ':' || v_pair.requested_slot,
      0
    ));
  end loop;

  with requested as (
    select (item ->> 'date')::date requested_date, item ->> 'slot' requested_slot
    from jsonb_array_elements(p_requested_slots) source(item)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', requested.requested_date,
    'slot', requested.requested_slot,
    'status', calendar.status,
    'activity', calendar.activity
  ) order by requested.requested_date, requested.requested_slot), '[]'::jsonb)
  into v_conflicts
  from requested
  join public.boat_calendar_slots calendar
    on calendar.date = requested.requested_date
   and calendar.slot = requested.requested_slot
  where not (
    calendar.status = 'available'
    or (calendar.status = 'hold' and calendar.expires_at is not null
        and calendar.expires_at <= v_now)
  );

  if jsonb_array_length(v_conflicts) > 0 then
    return query select false, null::uuid, v_conflicts;
    return;
  end if;

  begin
    insert into public.reservations_charter (
      date_debut, date_fin, formule, nombre_personnes,
      responsable_prenom, responsable_nom, responsable_email, responsable_tel,
      montant_total, montant_paye, montant_solde, type_paiement,
      statut_paiement, paye, paid_at, sunset_drink, champagne_supplement,
      sleeping_arrangement_accepted, conditions_accepted, reservation_manuelle
    ) values (
      p_date_debut, p_date_fin, p_formule, p_nombre_personnes,
      trim(p_responsable_prenom), trim(p_responsable_nom),
      nullif(trim(p_responsable_email), ''), trim(p_responsable_tel),
      p_montant_total, p_montant_paye, p_montant_solde, p_type_paiement,
      p_statut_paiement, p_statut_paiement = 'paid',
      case when p_montant_paye > 0 then now() else null end,
      p_sunset_drink, p_champagne_supplement,
      p_sleeping_arrangement_accepted, true, true
    ) returning id into v_reservation_id;

    insert into public.boat_calendar_slots (
      date, slot, status, activity, reservation_id, reservation_table,
      blocked_reason, blocked_by, blocked_at, expires_at
    )
    select (item ->> 'date')::date, item ->> 'slot', 'reserved', 'charter',
      v_reservation_id, 'reservations_charter', null, null, null, null
    from jsonb_array_elements(p_requested_slots) requested(item)
    order by (item ->> 'date')::date, item ->> 'slot'
    on conflict (date, slot) do update set
      status = 'reserved', activity = 'charter',
      reservation_id = v_reservation_id, reservation_table = 'reservations_charter',
      blocked_reason = null, blocked_by = null, blocked_at = null, expires_at = null
    where boat_calendar_slots.status = 'available'
       or (boat_calendar_slots.status = 'hold'
           and boat_calendar_slots.expires_at is not null
           and boat_calendar_slots.expires_at <= v_now);

    get diagnostics v_affected_count = row_count;
    if v_affected_count <> v_requested_count then
      raise exception 'Conflit concurrent Charter' using errcode = '40001';
    end if;
  exception when serialization_failure or unique_violation then
    return query select false, null::uuid,
      jsonb_build_array(jsonb_build_object('reason', 'concurrent_write'));
    return;
  end;

  return query select true, v_reservation_id, '[]'::jsonb;
end;
$$;

revoke all on function public.create_manual_charter_reservation(
  date, date, text, integer, text, text, text, text, integer, integer,
  integer, text, text, text, boolean, boolean, jsonb
) from public;

grant execute on function public.create_manual_charter_reservation(
  date, date, text, integer, text, text, text, text, integer, integer,
  integer, text, text, text, boolean, boolean, jsonb
) to service_role;

comment on function public.create_manual_charter_reservation(
  date, date, text, integer, text, text, text, text, integer, integer,
  integer, text, text, text, boolean, boolean, jsonb
) is 'Cree une reservation Charter admin et reserve tous ses slots dans une transaction atomique.';
