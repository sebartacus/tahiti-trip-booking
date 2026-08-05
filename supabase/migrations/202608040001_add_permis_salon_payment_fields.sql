alter table public.reservations
  add column if not exists mode_paiement text not null default 'payzen',
  add column if not exists reference_paiement text,
  add column if not exists paid_at timestamp with time zone,
  add column if not exists origine_reservation text not null default 'site';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_mode_paiement_check') then
    alter table public.reservations add constraint reservations_mode_paiement_check
      check (mode_paiement in ('payzen', 'especes', 'cheque', 'tpe')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_origine_reservation_check') then
    alter table public.reservations add constraint reservations_origine_reservation_check
      check (origine_reservation in ('site', 'salon_admin')) not valid;
  end if;
end $$;

alter table public.reservations validate constraint reservations_mode_paiement_check;
alter table public.reservations validate constraint reservations_origine_reservation_check;
