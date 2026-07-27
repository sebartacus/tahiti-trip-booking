alter table public.reservations
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamp with time zone;

create index if not exists reservations_archived_idx
  on public.reservations (archived);
