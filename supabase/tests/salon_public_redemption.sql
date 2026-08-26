begin;

do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='salon_baleines_rights' and column_name='public_code')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='salon_peche_rights' and column_name='public_code')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='salon_charter_rights' and column_name='public_code') then
    raise exception 'Codes publics Salon manquants';
  end if;
  if exists(select 1 from public.salon_baleines_rights where public_code is null)
    or exists(select 1 from public.salon_peche_rights where public_code is null)
    or exists(select 1 from public.salon_charter_rights where public_code is null) then
    raise exception 'Un droit Salon ne possede pas de code public';
  end if;
  if has_table_privilege('anon','public.salon_baleines_rights','select')
    or has_table_privilege('authenticated','public.salon_baleines_rights','select')
    or has_table_privilege('anon','public.salon_peche_rights','select')
    or has_table_privilege('authenticated','public.salon_peche_rights','select')
    or has_table_privilege('anon','public.salon_charter_rights','select')
    or has_table_privilege('authenticated','public.salon_charter_rights','select') then
    raise exception 'Lecture publique des droits Salon detectee';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('salon_baleines_rights','salon_peche_rights','salon_charter_rights') and column_name='public_code' and column_default is null) then
    raise exception 'Valeur par defaut des codes publics manquante';
  end if;
end;
$$;

rollback;
