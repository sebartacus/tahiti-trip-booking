create or replace function public.admin_delete_carnet_baleines(
  p_carnet_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.carnets_baleines
    where id = p_carnet_id
  ) then
    return false;
  end if;

  delete from public.mouvements_carnets_baleines
  where carnet_id = p_carnet_id;

  delete from public.carnets_baleines
  where id = p_carnet_id;

  return true;
end;
$$;

revoke all on function public.admin_delete_carnet_baleines(uuid) from public;
grant execute on function public.admin_delete_carnet_baleines(uuid) to service_role;
