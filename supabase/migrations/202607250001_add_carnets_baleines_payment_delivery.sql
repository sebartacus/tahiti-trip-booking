alter table public.carnets_baleines
  add column if not exists transaction_id text,
  add column if not exists paid_at timestamp with time zone,
  add column if not exists facture_numero text,
  add column if not exists facture_url text,
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone;

create unique index if not exists carnets_baleines_code_unique
  on public.carnets_baleines (code);

create unique index if not exists carnets_baleines_transaction_id_unique
  on public.carnets_baleines (transaction_id)
  where transaction_id is not null;
