alter table public.reservations_charter
  add column if not exists sunset_drink text,
  add column if not exists champagne_supplement boolean not null default false,
  add column if not exists sleeping_arrangement_accepted boolean not null default false,
  add column if not exists conditions_accepted boolean not null default false,
  add column if not exists montant_solde integer not null default 0;

alter table public.reservations_charter
  add constraint reservations_charter_sunset_options_check
    check (
      (
        formule <> 'sunset'
        and sunset_drink is null
        and champagne_supplement = false
      )
      or (
        formule = 'sunset'
        and sunset_drink in ('white_wine', 'champagne_included')
        and champagne_supplement = false
      )
      or (
        formule = 'sunset'
        and sunset_drink = 'white_wine'
      )
    );

alter table public.reservations_charter
  add constraint reservations_charter_solde_check
    check (
      montant_solde >= 0
      and montant_paye + montant_solde = montant_total
    );

alter table public.reservations_charter
  add constraint reservations_charter_conditions_check
    check (conditions_accepted = true);

alter table public.reservations_charter
  add constraint reservations_charter_sleeping_check
    check (
      not (
        formule in ('tetiaroa_2j_1n', 'tetiaroa_3j_2n')
        and nombre_personnes = 9
      )
      or sleeping_arrangement_accepted = true
    );
