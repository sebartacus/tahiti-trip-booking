create table if not exists public.reservations_charter (
  id uuid primary key default gen_random_uuid(),
  date_debut date not null,
  date_fin date not null,
  formule text not null,
  nombre_personnes integer not null,
  responsable_prenom text not null,
  responsable_nom text not null,
  responsable_email text not null,
  responsable_tel text not null,
  montant_total integer not null,
  montant_paye integer not null default 0,
  type_paiement text not null,
  statut_paiement text not null default 'pending',
  paye boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reservations_charter_formule_check
    check (
      formule in (
        'tetiaroa_2j_1n',
        'tetiaroa_3j_2n',
        'moorea_matin',
        'moorea_journee',
        'sunset'
      )
    ),

  constraint reservations_charter_dates_check
    check (
      date_fin >= date_debut
      and (
        (formule = 'tetiaroa_2j_1n' and date_fin = date_debut + 1)
        or (formule = 'tetiaroa_3j_2n' and date_fin = date_debut + 2)
        or (
          formule in ('moorea_matin', 'moorea_journee', 'sunset')
          and date_fin = date_debut
        )
      )
    ),

  constraint reservations_charter_nombre_personnes_check
    check (
      (formule in ('tetiaroa_2j_1n', 'tetiaroa_3j_2n') and nombre_personnes between 1 and 9)
      or (formule in ('moorea_matin', 'moorea_journee') and nombre_personnes between 1 and 12)
      or (formule = 'sunset' and nombre_personnes between 1 and 10)
    ),

  constraint reservations_charter_montants_check
    check (
      montant_total >= 0
      and montant_paye >= 0
      and montant_paye <= montant_total
    ),

  constraint reservations_charter_type_paiement_check
    check (type_paiement in ('deposit', 'full')),

  constraint reservations_charter_statut_paiement_check
    check (statut_paiement in ('pending', 'paid', 'paye', 'cancelled', 'failed'))
);

create index if not exists reservations_charter_dates_idx
  on public.reservations_charter (date_debut, date_fin);

create index if not exists reservations_charter_statut_paiement_idx
  on public.reservations_charter (statut_paiement);

create or replace function public.set_reservations_charter_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_reservations_charter_updated_at
  on public.reservations_charter;

create trigger set_reservations_charter_updated_at
before update on public.reservations_charter
for each row
execute function public.set_reservations_charter_updated_at();

alter table public.reservations_charter enable row level security;

alter table public.boat_calendar_slots
  drop constraint if exists boat_calendar_slots_activity_check;

alter table public.boat_calendar_slots
  add constraint boat_calendar_slots_activity_check
    check (activity in ('baleines', 'peche', 'peche_nuit', 'charter') or activity is null);

create or replace function public.acquire_charter_boat_holds(
  p_reservation_id uuid,
  p_reservation_table text,
  p_activity text,
  p_requested_slots jsonb,
  p_expires_at timestamptz default null
)
returns table (
  success boolean,
  conflicts jsonb,
  acquired_slots jsonb,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_expires_at timestamptz := coalesce(
    p_expires_at,
    clock_timestamp() + interval '30 minutes'
  );
  v_requested_count integer;
  v_affected_count integer;
  v_conflicts jsonb := '[]'::jsonb;
  v_acquired jsonb := '[]'::jsonb;
  v_pair record;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id requis' using errcode = '22023';
  end if;

  if p_reservation_table is distinct from 'reservations_charter' then
    raise exception 'reservation_table invalide pour un hold Charter' using errcode = '22023';
  end if;

  if p_activity is distinct from 'charter' then
    raise exception 'activity invalide pour un hold Charter' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.reservations_charter
    where id = p_reservation_id
  ) then
    raise exception 'reservation Charter introuvable' using errcode = '23503';
  end if;

  if jsonb_typeof(p_requested_slots) is distinct from 'array' then
    raise exception 'La liste des dates et slots doit etre un tableau JSON non vide'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_requested_slots) = 0 then
    raise exception 'La liste des dates et slots doit etre un tableau JSON non vide'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_requested_slots) as requested(item)
    where jsonb_typeof(item) is distinct from 'object'
      or coalesce(item ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or coalesce(item ->> 'slot', '') not in ('morning', 'afternoon')
  ) then
    raise exception 'Chaque element doit contenir une date ISO et un slot morning ou afternoon'
      using errcode = '22023';
  end if;

  select count(*)
  into v_requested_count
  from jsonb_array_elements(p_requested_slots);

  if (
    select count(*)
    from (
      select distinct item ->> 'date' as date_value, item ->> 'slot' as slot_value
      from jsonb_array_elements(p_requested_slots) as requested(item)
    ) as distinct_requests
  ) <> v_requested_count then
    raise exception 'La liste contient des couples date/slot en double'
      using errcode = '22023';
  end if;

  if v_expires_at <= v_now then
    raise exception 'expires_at doit etre dans le futur' using errcode = '22023';
  end if;

  -- Les verrous sont pris dans le meme ordre pour tous les appels. Ils
  -- protegent egalement les couples date/slot qui ne possedent pas encore de ligne.
  for v_pair in
    select
      (item ->> 'date')::date as requested_date,
      item ->> 'slot' as requested_slot
    from jsonb_array_elements(p_requested_slots) as requested(item)
    order by requested_date, requested_slot
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(
        'boat_calendar_slots:' || v_pair.requested_date::text || ':' || v_pair.requested_slot,
        0
      )
    );
  end loop;

  with requested as (
    select
      (item ->> 'date')::date as requested_date,
      item ->> 'slot' as requested_slot
    from jsonb_array_elements(p_requested_slots) as source(item)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', requested.requested_date,
        'slot', requested.requested_slot,
        'status', calendar.status,
        'activity', calendar.activity,
        'reservation_id', calendar.reservation_id,
        'reservation_table', calendar.reservation_table,
        'expires_at', calendar.expires_at
      )
      order by requested.requested_date, requested.requested_slot
    ),
    '[]'::jsonb
  )
  into v_conflicts
  from requested
  join public.boat_calendar_slots as calendar
    on calendar.date = requested.requested_date
   and calendar.slot = requested.requested_slot
  where not (
    calendar.status = 'available'
    or (
      calendar.status = 'hold'
      and calendar.expires_at is not null
      and calendar.expires_at <= v_now
    )
    or (
      calendar.status = 'hold'
      and calendar.reservation_id = p_reservation_id
      and calendar.reservation_table = p_reservation_table
      and calendar.activity = p_activity
    )
  );

  if jsonb_array_length(v_conflicts) > 0 then
    return query select false, v_conflicts, '[]'::jsonb, v_expires_at;
    return;
  end if;

  -- Le sous-bloc constitue un point de sauvegarde. Si un ecrivain historique
  -- ne prenant pas le verrou consultatif gagne une course, toutes les lignes
  -- de cet upsert sont annulees avant de retourner le conflit.
  begin
    insert into public.boat_calendar_slots (
      date,
      slot,
      status,
      activity,
      reservation_id,
      reservation_table,
      blocked_reason,
      blocked_by,
      blocked_at,
      expires_at
    )
    select
      (item ->> 'date')::date,
      item ->> 'slot',
      'hold',
      p_activity,
      p_reservation_id,
      p_reservation_table,
      null,
      null,
      null,
      v_expires_at
    from jsonb_array_elements(p_requested_slots) as requested(item)
    order by (item ->> 'date')::date, item ->> 'slot'
    on conflict (date, slot) do update
    set
      status = 'hold',
      activity = excluded.activity,
      reservation_id = excluded.reservation_id,
      reservation_table = excluded.reservation_table,
      blocked_reason = null,
      blocked_by = null,
      blocked_at = null,
      expires_at = excluded.expires_at
    where boat_calendar_slots.status = 'available'
      or (
        boat_calendar_slots.status = 'hold'
        and boat_calendar_slots.expires_at is not null
        and boat_calendar_slots.expires_at <= v_now
      )
      or (
        boat_calendar_slots.status = 'hold'
        and boat_calendar_slots.reservation_id = p_reservation_id
        and boat_calendar_slots.reservation_table = p_reservation_table
        and boat_calendar_slots.activity = p_activity
      );

    get diagnostics v_affected_count = row_count;

    if v_affected_count <> v_requested_count then
      raise exception 'conflit concurrent pendant l acquisition des slots'
        using errcode = '40001';
    end if;
  exception
    when serialization_failure or unique_violation then
      with requested as (
        select
          (item ->> 'date')::date as requested_date,
          item ->> 'slot' as requested_slot
        from jsonb_array_elements(p_requested_slots) as source(item)
      )
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', requested.requested_date,
            'slot', requested.requested_slot,
            'status', calendar.status,
            'activity', calendar.activity,
            'reservation_id', calendar.reservation_id,
            'reservation_table', calendar.reservation_table,
            'expires_at', calendar.expires_at
          )
          order by requested.requested_date, requested.requested_slot
        ),
        jsonb_build_array(
          jsonb_build_object('reason', 'concurrent_write')
        )
      )
      into v_conflicts
      from requested
      join public.boat_calendar_slots as calendar
        on calendar.date = requested.requested_date
       and calendar.slot = requested.requested_slot
      where not (
        calendar.status = 'available'
        or (
          calendar.status = 'hold'
          and calendar.expires_at is not null
          and calendar.expires_at <= clock_timestamp()
        )
        or (
          calendar.status = 'hold'
          and calendar.reservation_id = p_reservation_id
          and calendar.reservation_table = p_reservation_table
          and calendar.activity = p_activity
        )
      );

      return query select false, v_conflicts, '[]'::jsonb, v_expires_at;
      return;
  end;

  with requested as (
    select
      (item ->> 'date')::date as requested_date,
      item ->> 'slot' as requested_slot
    from jsonb_array_elements(p_requested_slots) as source(item)
  )
  select coalesce(
    jsonb_agg(
      to_jsonb(calendar)
      order by calendar.date, calendar.slot
    ),
    '[]'::jsonb
  )
  into v_acquired
  from requested
  join public.boat_calendar_slots as calendar
    on calendar.date = requested.requested_date
   and calendar.slot = requested.requested_slot
  where calendar.status = 'hold'
    and calendar.activity = p_activity
    and calendar.reservation_id = p_reservation_id
    and calendar.reservation_table = p_reservation_table;

  return query select true, '[]'::jsonb, v_acquired, v_expires_at;
end;
$$;

revoke all on function public.acquire_charter_boat_holds(
  uuid,
  text,
  text,
  jsonb,
  timestamptz
) from public;

grant execute on function public.acquire_charter_boat_holds(
  uuid,
  text,
  text,
  jsonb,
  timestamptz
) to service_role;

comment on function public.acquire_charter_boat_holds(
  uuid,
  text,
  text,
  jsonb,
  timestamptz
) is 'Acquiert atomiquement tous les holds Charter demandes. Les holds actifs sont proteges jusqu a expires_at.';
