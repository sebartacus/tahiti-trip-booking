alter table public.salon_baleines_rights
  add column if not exists public_code text;
alter table public.salon_peche_rights
  add column if not exists public_code text;
alter table public.salon_charter_rights
  add column if not exists public_code text;

update public.salon_baleines_rights set public_code=upper(encode(gen_random_bytes(10),'hex')) where public_code is null;
update public.salon_peche_rights set public_code=upper(encode(gen_random_bytes(10),'hex')) where public_code is null;
update public.salon_charter_rights set public_code=upper(encode(gen_random_bytes(10),'hex')) where public_code is null;

alter table public.salon_baleines_rights alter column public_code set default upper(encode(gen_random_bytes(10),'hex'));
alter table public.salon_peche_rights alter column public_code set default upper(encode(gen_random_bytes(10),'hex'));
alter table public.salon_charter_rights alter column public_code set default upper(encode(gen_random_bytes(10),'hex'));
alter table public.salon_baleines_rights alter column public_code set not null;
alter table public.salon_peche_rights alter column public_code set not null;
alter table public.salon_charter_rights alter column public_code set not null;

create unique index if not exists salon_baleines_rights_public_code_key on public.salon_baleines_rights(public_code);
create unique index if not exists salon_peche_rights_public_code_key on public.salon_peche_rights(public_code);
create unique index if not exists salon_charter_rights_public_code_key on public.salon_charter_rights(public_code);

revoke all on public.salon_baleines_rights from anon,authenticated;
revoke all on public.salon_peche_rights from anon,authenticated;
revoke all on public.salon_charter_rights from anon,authenticated;
