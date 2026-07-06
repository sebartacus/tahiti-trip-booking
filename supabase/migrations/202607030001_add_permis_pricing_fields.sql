alter table public.reservations
  add column if not exists pricing_type text not null default 'normal',
  add column if not exists pricing_amount integer,
  add column if not exists facture_numero text,
  add column if not exists facture_url text,
  add column if not exists email_sent boolean not null default false,
  add column if not exists email_sent_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_pricing_type_check'
  ) then
    alter table public.reservations
      add constraint reservations_pricing_type_check
      check (pricing_type in ('normal', 'promo_internet', 'salon_tourisme'))
      not valid;
  end if;
end $$;

alter table public.reservations
  validate constraint reservations_pricing_type_check;
