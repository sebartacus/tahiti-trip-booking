-- Manual admin credit: no reservation is created or updated.
create or replace function public.admin_recredit_carnet_baleines(
  p_carnet_id uuid,
  p_nombre_credits numeric,
  p_motif text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_carnet public.carnets_baleines%rowtype;
  v_credits integer;
  v_motif text;
  v_created_at timestamptz := now();
begin
  if p_nombre_credits is null or p_nombre_credits < 1
     or p_nombre_credits > 2147483647
     or p_nombre_credits <> trunc(p_nombre_credits) then
    raise exception using errcode = '22023',
      message = 'Le nombre de crédits doit être un entier supérieur ou égal à 1.';
  end if;
  v_credits := p_nombre_credits::integer;
  v_motif := coalesce(nullif(btrim(p_motif), ''), 'Recrédit manuel');
  if length(v_motif) > 1000 then
    raise exception using errcode = '22023', message = 'Le motif est limité à 1000 caractères.';
  end if;

  select * into v_carnet from public.carnets_baleines
    where id = p_carnet_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Carnet introuvable.';
  end if;
  if lower(v_carnet.statut) in ('cancelled', 'canceled', 'annule', 'annulé') then
    raise exception using errcode = '22023',
      message = 'Ce carnet est annulé : le recrédit est refusé.';
  end if;
  if v_carnet.credits_restants is null
     or v_carnet.credits_restants::bigint + v_credits > 2147483647 then
    raise exception using errcode = '22023', message = 'Solde de crédits invalide ou trop élevé.';
  end if;

  update public.carnets_baleines
    set credits_restants = credits_restants + v_credits,
        statut = case when statut = 'epuise' then 'actif' else statut end
    where id = p_carnet_id
    returning * into v_carnet;

  insert into public.mouvements_carnets_baleines
    (carnet_id, reservation_id, mouvement, motif, created_at)
    values (p_carnet_id, null, v_credits, v_motif, v_created_at);

  return jsonb_build_object(
    'id', v_carnet.id, 'credits_restants', v_carnet.credits_restants,
    'statut', v_carnet.statut, 'mouvement', v_credits,
    'motif', v_motif, 'created_at', v_created_at
  );
end;
$$;

revoke all on function public.admin_recredit_carnet_baleines(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.admin_recredit_carnet_baleines(uuid, numeric, text)
  to service_role;
