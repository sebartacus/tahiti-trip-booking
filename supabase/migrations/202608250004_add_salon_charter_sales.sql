create table if not exists public.salon_charter_rights (
 id uuid primary key default gen_random_uuid(), sale_item_id uuid not null unique references public.salon_sale_items(id) on delete cascade,
 offer_code text not null, nombre_personnes integer not null check(nombre_personnes between 1 and 9), sleeping_arrangement_accepted boolean not null default false,
 montant_paye integer not null, valid_until date not null, status text not null default 'unused' check(status in('unused','redeemed')),
 reservation_id uuid references public.reservations_charter(id), created_at timestamptz not null default now(), redeemed_at timestamptz
);
alter table public.salon_charter_rights enable row level security;
revoke all on public.salon_charter_rights from anon,authenticated;
grant select,insert,update,delete on public.salon_charter_rights to service_role;

create or replace function public.create_salon_charter_sale(p_offer_code text,p_price integer,p_prenom text,p_nom text,p_telephone text,p_email text,p_nombre_personnes integer,p_sleeping_accepted boolean,p_payment_method text,p_payment_reference text,p_commentaire text,p_date_debut date,p_requested_slots jsonb)
returns table(sale_id uuid,item_id uuid,reservation_id uuid,right_id uuid) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_sale uuid;v_item uuid;v_res uuid;v_right uuid;v_manual record;v_type text;
begin
 if p_offer_code<>'charter_tetiaroa_2j_1n' or p_price<=0 then raise exception 'Offre Charter Salon invalide' using errcode='22023';end if;
 if p_nombre_personnes not between 1 and 9 or (p_nombre_personnes=9 and not p_sleeping_accepted) then raise exception 'Participants ou couchage Charter invalides' using errcode='22023';end if;
 if p_payment_method not in('tpe','especes','cheque','virement') then raise exception 'Paiement Salon invalide' using errcode='22023';end if;
 if p_date_debut is not null then
   select * into v_manual from public.create_manual_charter_reservation(p_date_debut,p_date_debut+1,'tetiaroa_2j_1n',p_nombre_personnes,p_prenom,p_nom,p_email,p_telephone,p_price,p_price,0,case p_payment_method when 'tpe' then 'card_terminal' when 'especes' then 'cash' when 'cheque' then 'check' else 'bank_transfer' end,'paid',null,false,p_sleeping_accepted,p_requested_slots);
   if not coalesce(v_manual.success,false) then raise exception 'Conflit calendrier Charter' using errcode='P0001';end if;v_res:=v_manual.reservation_id;
 end if;
 insert into public.salon_sales(client_prenom,client_nom,client_telephone,client_email,payment_method,payment_reference,montant_total,montant_encaisse,montant_solde,statut,commentaire_interne) values(trim(p_prenom),trim(p_nom),trim(p_telephone),nullif(trim(p_email),''),p_payment_method,nullif(trim(p_payment_reference),''),p_price,p_price,0,'invoice_pending',nullif(trim(p_commentaire),'')) returning id into v_sale;
 v_type:=case when v_res is null then 'salon_charter_rights' else 'reservations_charter' end;
 insert into public.salon_sale_items(sale_id,activity,offer_code,libelle,quantity,unit_price,total_price,valid_until,status,reservation_type,reservation_id) values(v_sale,'charter',p_offer_code,'Tetiaroa 2 jours / 1 nuit — catamaran privatisé',1,p_price,p_price,date '2027-01-31','reserved',v_type,coalesce(v_res::text,'')) returning id into v_item;
 if v_res is null then insert into public.salon_charter_rights(sale_item_id,offer_code,nombre_personnes,sleeping_arrangement_accepted,montant_paye,valid_until) values(v_item,p_offer_code,p_nombre_personnes,p_sleeping_accepted,p_price,date '2027-01-31') returning id into v_right;update public.salon_sale_items set reservation_id=v_right::text where id=v_item;end if;
 return query select v_sale,v_item,v_res,v_right;
end $$;
revoke all on function public.create_salon_charter_sale(text,integer,text,text,text,text,integer,boolean,text,text,text,date,jsonb) from public;
grant execute on function public.create_salon_charter_sale(text,integer,text,text,text,text,integer,boolean,text,text,text,date,jsonb) to service_role;

create or replace function public.redeem_salon_charter_right(p_right_id uuid,p_date_debut date,p_requested_slots jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_right public.salon_charter_rights%rowtype;v_sale public.salon_sales%rowtype;v_manual record;v_res uuid;
begin select * into v_right from public.salon_charter_rights where id=p_right_id for update;if not found or v_right.status<>'unused' then raise exception 'Droit Charter indisponible' using errcode='P0001';end if;select s.* into v_sale from public.salon_sales s join public.salon_sale_items i on i.sale_id=s.id where i.id=v_right.sale_item_id;
 select * into v_manual from public.create_manual_charter_reservation(p_date_debut,p_date_debut+1,'tetiaroa_2j_1n',v_right.nombre_personnes,v_sale.client_prenom,v_sale.client_nom,v_sale.client_email,v_sale.client_telephone,v_right.montant_paye,v_right.montant_paye,0,case v_sale.payment_method when 'tpe' then 'card_terminal' when 'especes' then 'cash' when 'cheque' then 'check' else 'bank_transfer' end,'paid',null,false,v_right.sleeping_arrangement_accepted,p_requested_slots);
 if not coalesce(v_manual.success,false) then raise exception 'Conflit calendrier Charter' using errcode='P0001';end if;v_res:=v_manual.reservation_id;update public.salon_charter_rights set status='redeemed',reservation_id=v_res,redeemed_at=now() where id=p_right_id;update public.salon_sale_items set reservation_type='reservations_charter',reservation_id=v_res::text,status='redeemed' where id=v_right.sale_item_id;return v_res;end $$;
revoke all on function public.redeem_salon_charter_right(uuid,date,jsonb) from public;grant execute on function public.redeem_salon_charter_right(uuid,date,jsonb) to service_role;

create or replace function public.admin_delete_salon_charter_item(p_sale_id uuid,p_item_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item public.salon_sale_items%rowtype;v_status text;v_start date;v_path text;v_count integer;
begin select * into v_item from public.salon_sale_items where id=p_item_id and sale_id=p_sale_id and activity='charter' for update;if not found then return jsonb_build_object('deleted',false);end if;select facture_url into v_path from public.salon_sales where id=p_sale_id for update;
 if v_item.reservation_type='salon_charter_rights' then select status into v_status from public.salon_charter_rights where id=v_item.reservation_id::uuid for update;if v_status is distinct from 'unused' then raise exception 'Ce droit Charter a déjà été utilisé.' using errcode='P0001';end if;delete from public.salon_charter_rights where id=v_item.reservation_id::uuid;
 elsif v_item.reservation_type='reservations_charter' then select date_debut into v_start from public.reservations_charter where id=v_item.reservation_id::uuid for update;if v_start<=current_date then raise exception 'Cette réservation Charter est passée ou en cours.' using errcode='P0001';end if;delete from public.boat_calendar_slots where reservation_id=v_item.reservation_id::uuid and reservation_table='reservations_charter' and activity='charter';delete from public.reservations_charter where id=v_item.reservation_id::uuid;
 else raise exception 'Référence Charter Salon invalide' using errcode='22023';end if;delete from public.salon_sale_items where id=p_item_id;select count(*) into v_count from public.salon_sale_items where sale_id=p_sale_id;if v_count=0 then delete from public.salon_sales where id=p_sale_id;end if;return jsonb_build_object('deleted',true,'invoicePath',v_path,'saleDeleted',v_count=0);end $$;
revoke all on function public.admin_delete_salon_charter_item(uuid,uuid) from public;grant execute on function public.admin_delete_salon_charter_item(uuid,uuid) to service_role;
