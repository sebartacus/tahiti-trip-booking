-- LOCAL DISPOSABLE DATABASE ONLY. psql -v ON_ERROR_STOP=1 -f this-file.sql
-- Prerequisite: project schema, roles and the preparatory migration already present.
-- No production execution. All test mutations are rolled back.
begin;
do $$
declare rid text; challenge uuid := gen_random_uuid(); result text; n integer;
begin
  insert into public.reservations(prenom,nom,email,telephone,formule,examen,paiement_effectue,archived)
    values('Test','Permis','permis-foundation@example.invalid','000000991','Classique','Plus tard',false,false)
    returning id::text into rid;
  result := public.permis_issue_access_challenge(challenge,'permis-foundation@example.invalid',repeat('a',64),repeat('1',64),repeat('2',64));
  assert result='permis-foundation@example.invalid','stored destination';
  assert public.permis_consume_access_challenge(challenge,repeat('b',64),repeat('3',64)) is null,'wrong code';
  assert public.permis_consume_access_challenge(challenge,repeat('a',64),repeat('3',64))=rid,'correct code';
  assert public.permis_consume_access_challenge(challenge,repeat('a',64),repeat('3',64)) is null,'single use';
  challenge := gen_random_uuid();
  insert into public.permis_access_challenges(id,reservation_id,code_hash,expires_at) values(challenge,rid,repeat('a',64),clock_timestamp()-interval '1 second');
  assert public.permis_consume_access_challenge(challenge,repeat('a',64),repeat('3',64)) is null,'expired';
  challenge := gen_random_uuid();
  insert into public.permis_access_challenges(id,reservation_id,code_hash,expires_at) values(challenge,rid,repeat('a',64),clock_timestamp()+interval '10 minutes');
  for n in 1..5 loop
    assert public.permis_consume_access_challenge(challenge,repeat('b',64),repeat('3',64)) is null,'bad attempt';
  end loop;
  assert public.permis_consume_access_challenge(challenge,repeat('a',64),repeat('3',64)) is null,'attempt cap';
  assert public.permis_take_access_limit(repeat('4',64),2),'limit first';
  assert public.permis_take_access_limit(repeat('4',64),2),'limit second';
  assert not public.permis_take_access_limit(repeat('4',64),2),'limit denied';
  assert public.permis_parse_civil_date('12 août 2026')=date '2026-08-12','French date';
  assert public.permis_parse_civil_date('Plus tard') is null,'absent exam';
  assert not (public.permis_course_range('11/08/2026','09h00 - 11h00') && public.permis_course_range('11/08/2026','11h00 - 13h00')),'adjacent slots';
  assert public.permis_course_range('11/08/2026','13h00 - 17h00') && public.permis_course_range('11/08/2026','15h00 - 17h00'),'overlap';
end $$;
do $$
declare fn record; role_name text; tbl text;
begin
  for fn in select p.oid from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where ns.nspname='public' and p.proname in ('permis_take_access_limit','permis_issue_access_challenge','permis_consume_access_challenge','permis_parse_civil_date','permis_course_range','permis_save_planning')
  loop
    foreach role_name in array array['anon','authenticated'] loop
      assert not has_function_privilege(role_name,fn.oid,'EXECUTE'),'public function access';
    end loop;
    assert has_function_privilege('service_role',fn.oid,'EXECUTE'),'server function access';
  end loop;
  foreach tbl in array array['permis_access_challenges','permis_access_limits'] loop
    assert (select relrowsecurity from pg_class where oid=('public.'||tbl)::regclass),'RLS enabled';
    foreach role_name in array array['anon','authenticated'] loop
      assert not has_table_privilege(role_name,'public.'||tbl,'SELECT,INSERT,UPDATE,DELETE'),'public table access';
    end loop;
  end loop;
end $$;
do $$
declare rid text; other_id text; result jsonb; initial jsonb := '{"examen":null,"date_cours":null,"creneau":null}'::jsonb;
  course date := (clock_timestamp() at time zone 'Pacific/Tahiti')::date + 20;
  exam date := course + 10; challenge uuid := gen_random_uuid();
begin
  -- Avoid the Wednesday-morning restriction in this generic slot fixture.
  if extract(dow from course)=3 then course := course+1; end if;
  insert into public.reservations(prenom,nom,email,telephone,formule,examen,paiement_effectue,archived)
    values('Planning','One','planning-foundation@example.invalid','000000992','Classique','Plus tard',false,false) returning id::text into rid;
  result := public.permis_save_planning(rid,initial,jsonb_build_object('examen',exam));
  assert result->>'status'='changed','exam alone';
  result := public.permis_save_planning(rid,result->'after',jsonb_build_object('examen',to_char(exam,'DD/MM/YYYY')));
  assert result->>'status'='unchanged','same normalized date';
  result := public.permis_save_planning(rid,result->'after',jsonb_build_object('date_cours',course,'creneau','13h00 - 15h00'));
  assert result->>'status'='changed','add course';
  assert public.permis_save_planning(rid,initial,'{}')->>'status'='stale','stale client';
  insert into public.reservations(prenom,nom,email,telephone,formule,examen,paiement_effectue,archived)
    values('Planning','Two','planning-foundation@example.invalid','000000993','Classique','Plus tard',false,false) returning id::text into other_id;
  result := public.permis_save_planning(other_id,initial,jsonb_build_object('date_cours',course,'creneau','13h00 - 17h00'));
  assert result->>'status'='conflict','overlap refused';
  assert (select date_cours is null from public.reservations where id::text=other_id),'conflict unchanged';
  result := public.permis_save_planning(other_id,initial,jsonb_build_object('date_cours',course,'creneau','15h00 - 17h00'));
  assert result->>'status'='changed','adjacent course alone';
  assert public.permis_issue_access_challenge(challenge,'planning-foundation@example.invalid',repeat('a',64),repeat('5',64),repeat('6',64)) is null,'ambiguous contact';
  assert not exists(select 1 from public.permis_access_challenges where id=challenge),'no ambiguous challenge';
  assert public.permis_issue_access_challenge(gen_random_uuid(),'not-found@example.invalid',repeat('a',64),repeat('7',64),repeat('8',64)) is null,'unknown contact';
end $$;

rollback;
