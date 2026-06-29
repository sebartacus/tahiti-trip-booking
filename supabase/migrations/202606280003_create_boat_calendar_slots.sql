create table if not exists public.boat_calendar_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot text not null,
  status text not null default 'available',
  activity text null,
  reservation_id uuid null,
  reservation_table text null,
  blocked_reason text null,
  blocked_by text null,
  blocked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_calendar_slots_date_slot_key
    unique (date, slot),

  constraint boat_calendar_slots_slot_check
    check (slot in ('morning', 'afternoon')),

  constraint boat_calendar_slots_status_check
    check (status in ('available', 'hold', 'reserved', 'blocked')),

  constraint boat_calendar_slots_activity_check
    check (activity in ('baleines', 'peche', 'peche_nuit') or activity is null),

  constraint boat_calendar_slots_available_shape_check
    check (
      status <> 'available'
      or (
        activity is null
        and reservation_id is null
        and reservation_table is null
        and blocked_reason is null
        and blocked_by is null
        and blocked_at is null
      )
    ),

  constraint boat_calendar_slots_hold_shape_check
    check (
      status <> 'hold'
      or (
        activity is not null
        and reservation_id is not null
        and reservation_table is not null
        and blocked_reason is null
        and blocked_by is null
        and blocked_at is null
      )
    ),

  constraint boat_calendar_slots_reserved_shape_check
    check (
      status <> 'reserved'
      or (
        activity is not null
        and reservation_id is not null
        and reservation_table is not null
        and blocked_reason is null
        and blocked_by is null
        and blocked_at is null
      )
    ),

  constraint boat_calendar_slots_blocked_shape_check
    check (
      status <> 'blocked'
      or (
        activity is null
        and reservation_id is null
        and reservation_table is null
      )
    )
);

create index if not exists boat_calendar_slots_date_status_idx
  on public.boat_calendar_slots (date, status);

create index if not exists boat_calendar_slots_activity_idx
  on public.boat_calendar_slots (activity)
  where activity is not null;

create or replace function public.set_boat_calendar_slots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_boat_calendar_slots_updated_at
  on public.boat_calendar_slots;

create trigger set_boat_calendar_slots_updated_at
before update on public.boat_calendar_slots
for each row
execute function public.set_boat_calendar_slots_updated_at();

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
  created_at,
  updated_at
)
select
  d.date,
  s.slot,
  d.status,
  d.activity,
  d.reservation_id,
  d.reservation_table,
  d.blocked_reason,
  d.blocked_by,
  d.blocked_at,
  d.created_at,
  d.updated_at
from public.boat_calendar_days d
cross join (values ('morning'), ('afternoon')) as s(slot)
on conflict (date, slot) do nothing;

alter table public.boat_calendar_slots enable row level security;

drop policy if exists "boat_calendar_slots_public_select"
  on public.boat_calendar_slots;

create policy "boat_calendar_slots_public_select"
  on public.boat_calendar_slots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "boat_calendar_slots_public_insert"
  on public.boat_calendar_slots;

create policy "boat_calendar_slots_public_insert"
  on public.boat_calendar_slots
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "boat_calendar_slots_public_update"
  on public.boat_calendar_slots;

create policy "boat_calendar_slots_public_update"
  on public.boat_calendar_slots
  for update
  to anon, authenticated
  using (true)
  with check (true);
