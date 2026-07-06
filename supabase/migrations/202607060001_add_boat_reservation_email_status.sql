alter table public.reservations_peche
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone;

alter table public.reservations_baleines
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone;
