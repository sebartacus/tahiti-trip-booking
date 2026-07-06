alter table public.reservations_peche
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone,
  add column if not exists facture_numero text,
  add column if not exists facture_url text;

alter table public.reservations_baleines
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone,
  add column if not exists facture_numero text,
  add column if not exists facture_url text;
