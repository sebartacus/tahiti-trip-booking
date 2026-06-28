alter table public.boat_calendar_days enable row level security;

drop policy if exists "boat_calendar_days_public_select"
  on public.boat_calendar_days;

create policy "boat_calendar_days_public_select"
  on public.boat_calendar_days
  for select
  to anon, authenticated
  using (true);

drop policy if exists "boat_calendar_days_public_insert"
  on public.boat_calendar_days;

create policy "boat_calendar_days_public_insert"
  on public.boat_calendar_days
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "boat_calendar_days_public_update"
  on public.boat_calendar_days;

create policy "boat_calendar_days_public_update"
  on public.boat_calendar_days
  for update
  to anon, authenticated
  using (true)
  with check (true);
