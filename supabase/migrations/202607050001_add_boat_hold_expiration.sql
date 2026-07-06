alter table public.boat_calendar_slots
  add column if not exists expires_at timestamptz;

update public.boat_calendar_slots
set expires_at = coalesce(updated_at, created_at, now()) + interval '30 minutes'
where status = 'hold'
  and expires_at is null;

update public.boat_calendar_slots
set expires_at = null
where status <> 'hold'
  and expires_at is not null;

create index if not exists boat_calendar_slots_hold_expires_at_idx
  on public.boat_calendar_slots (expires_at)
  where status = 'hold';
