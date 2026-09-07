-- Disposable local database only. No production execution.
begin;
do $$
declare rid text; result jsonb; initial jsonb := '{"examen":null,"date_cours":null,"creneau":null}';
  course date := (clock_timestamp() at time zone 'Pacific/Tahiti')::date + 30;
  exam date := course + 10; denied boolean; challenge uuid; n integer;
begin
  insert into public.reservations(prenom,nom,email,telephone,formule,examen)
    values('Secure','Local','secure-reprise@example.invalid','000000994','Classique','Plus tard') returning id::text into rid;
  assert public.permis_issue_access_challenge(gen_random_uuid(),'000000000',repeat('a',64),repeat('1',64),repeat('2',64)) is null,'unknown phone generic';
  challenge := gen_random_uuid();
  assert public.permis_issue_access_challenge(challenge,'000000994',repeat('a',64),repeat('3',64),repeat('4',64))='secure-reprise@example.invalid','phone sends only stored email';
  for n in 1..5 loop
    assert public.permis_consume_access_challenge(challenge,repeat('b',64),repeat('5',64)) is null,'wrong code';
  end loop;
  assert public.permis_consume_access_challenge(challenge,repeat('a',64),repeat('5',64)) is null,'sixth correct attempt denied';
  for n in 1..3 loop
    result := to_jsonb(public.permis_issue_access_challenge(gen_random_uuid(),'secure-reprise@example.invalid',repeat('a',64),repeat('6',64),repeat('7',64)));
  end loop;
  assert public.permis_issue_access_challenge(gen_random_uuid(),'secure-reprise@example.invalid',repeat('a',64),repeat('6',64),repeat('7',64)) is null,'persistent contact/dossier rate cap';
  assert (select count(*) from public.permis_access_challenges where reservation_id=rid)=3,'dossier aliases share cap';

  insert into public.examens_bloques(date_examen) values(exam);
  denied := false;
  begin
    perform public.permis_save_planning(rid,initial,jsonb_build_object('examen',exam));
  exception when others then
    assert sqlerrm='Blocked exam','expected blocked error'; denied := true;
  end;
  assert denied,'blocked exam denied';
  assert (select examen='Plus tard' and date_cours is null from public.reservations where id::text=rid),'blocked save untouched';
  delete from public.examens_bloques where date_examen=exam;
  foreach course in array array[exam, exam+1] loop
    denied := false;
    begin
      perform public.permis_save_planning(rid,initial,jsonb_build_object('examen',exam,'date_cours',course,'creneau','13h00 - 15h00'));
    exception when others then
      assert sqlerrm='Course must precede exam'; denied := true;
    end;
    assert denied,'same day or after exam denied';
  end loop;
  result := public.permis_save_planning(rid,initial,jsonb_build_object('examen',exam));
  assert result->>'status'='changed';
  insert into public.examens_bloques(date_examen) values(exam);
  denied := false;
  begin
    perform public.permis_save_planning(rid,result->'after',jsonb_build_object('date_cours',exam-1,'creneau','13h00 - 15h00'));
  exception when others then
    assert sqlerrm='Blocked exam'; denied := true;
  end;
  assert denied,'already selected exam blocked before course change';
  assert (select date_cours is null from public.reservations where id::text=rid),'failed course save untouched';
end $$;
rollback;
