create extension if not exists pgcrypto;

create table if not exists public.boat_calendar_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  status text not null default 'available',
  activity text null,
  reservation_id uuid null,
  reservation_table text null,
  blocked_reason text null,
  blocked_by text null,
  blocked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_calendar_days_status_check
    check (status in ('available', 'hold', 'reserved', 'blocked')),

  constraint boat_calendar_days_activity_check
    check (activity in ('baleines', 'peche', 'peche_nuit') or activity is null),

  constraint boat_calendar_days_available_shape_check
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

  constraint boat_calendar_days_hold_shape_check
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

  constraint boat_calendar_days_reserved_shape_check
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

  constraint boat_calendar_days_blocked_shape_check
    check (
      status <> 'blocked'
      or (
        activity is null
        and reservation_id is null
        and reservation_table is null
      )
    )
);

create index if not exists boat_calendar_days_date_status_idx
  on public.boat_calendar_days (date, status);

create index if not exists boat_calendar_days_activity_idx
  on public.boat_calendar_days (activity)
  where activity is not null;

create or replace function public.set_boat_calendar_days_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_boat_calendar_days_updated_at
  on public.boat_calendar_days;

create trigger set_boat_calendar_days_updated_at
before update on public.boat_calendar_days
for each row
execute function public.set_boat_calendar_days_updated_at();
