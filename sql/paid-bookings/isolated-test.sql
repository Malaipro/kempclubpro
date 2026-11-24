-- E1 compatibility regression after schema-fixture.sql + resident-checkins/up.sql + paid-bookings/up.sql.
-- Local PostgreSQL only. All identities and events are synthetic.
\set ON_ERROR_STOP on

INSERT INTO public.schedules(id, title, activity_type, start_time, end_time, schedule_type, max_participants) VALUES
 ('20000000-0000-0000-0000-0000000000f1', 'Бесплатное', 'БЖЖ', now()+interval '2 days', now()+interval '2 days 2 hours', 'club', null),
 ('20000000-0000-0000-0000-0000000000a1', 'Выезд', 'Выезд', now()+interval '5 days', now()+interval '5 days 2 hours', 'club', 3),
 ('20000000-0000-0000-0000-0000000000cc', 'Последнее место', 'Баня', now()+interval '5 days', now()+interval '5 days 2 hours', 'club', 1),
 ('20000000-0000-0000-0000-0000000000b9', 'Интенсив', 'BJJ', now()+interval '2 days', now()+interval '2 days 2 hours', 'intensive', 10),
 ('20000000-0000-0000-0000-0000000000d1', 'Legacy 1', 'Legacy 1', now()+interval '6 days', now()+interval '6 days 2 hours', 'club', null),
 ('20000000-0000-0000-0000-0000000000d2', 'Legacy many', 'Legacy many', now()+interval '7 days', now()+interval '7 days 2 hours', 'club', null),
 ('20000000-0000-0000-0000-0000000000fd', 'Free delete', 'Free delete', now()+interval '8 days', now()+interval '8 days 2 hours', 'club', null);
INSERT INTO public.schedule_participants(schedule_id, user_id) VALUES
 ('20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000004'),
 ('20000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000002');

CREATE FUNCTION pg_temp.expect(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'OK: %', label; END $$;
CREATE FUNCTION pg_temp.raises(stmt text, expected text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE stmt; RAISE EXCEPTION 'FAIL: % (no error)', label;
EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' OR (expected IS NOT NULL AND SQLERRM NOT LIKE '%'||expected||'%') THEN RAISE EXCEPTION 'FAIL: % got %', label, SQLERRM; END IF; RAISE NOTICE 'OK: %', label; END $$;
CREATE FUNCTION pg_temp.lq(q text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE r text; BEGIN EXECUTE q INTO r; RETURN r; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.lq(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION pg_temp.expect(boolean,text), pg_temp.raises(text,text,text) TO PUBLIC;

SELECT pg_temp.expect((SELECT bool_and(booking_mode='free') FROM schedules),'существующие события остались free');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants)=3,'legacy-записи сохранены');
SELECT pg_temp.expect((SELECT relrowsecurity FROM pg_class WHERE oid='public.schedules'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.schedule_participants'::regclass),'fixture: RLS включён');
SELECT pg_temp.expect(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_participants'::regclass AND contype='f' AND confrelid='auth.users'::regclass),'fixture: FK schedule_participants.user_id -> auth.users');
SELECT pg_temp.expect(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_participants'::regclass AND contype='u'),'fixture: UNIQUE schedule_id+user_id');
SELECT pg_temp.expect(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.schedule_participants'::regclass AND tgname='trg_notify_booking_change' AND NOT tgisinternal),'fixture: notification trigger без сети');
SELECT pg_temp.expect((SELECT array_to_string(proconfig, ',') LIKE '%search_path=""%' FROM pg_proc WHERE oid='public.paid_booking_ledger_append_only()'::regprocedure),'paid_booking_ledger_append_only: search_path зафиксирован пустым');
SELECT pg_temp.expect((SELECT array_to_string(proconfig, ',') LIKE '%search_path=""%' FROM pg_proc WHERE oid='public.paid_bookings_no_delete()'::regprocedure),'paid_bookings_no_delete: search_path зафиксирован пустым');

-- Бесплатное событие: прежнее поведение
SET ROLE authenticated; SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(register_for_event_web('20000000-0000-0000-0000-0000000000f1')->>'ok'='true','free: register_for_event_web как раньше');
SET test.uid='00000000-0000-0000-0000-000000000002';
INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('20000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect(true,'free: прямой INSERT как раньше');

-- Настройки: только основатель. Legacy free -> paid всегда fail-closed.
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,'Условия','https://qr.nspk.ru/x',null)->>'error'='forbidden','резидент не включает оплату');
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT pg_temp.raises($$UPDATE schedules SET booking_mode='paid', price_total_rub=1, prepay_rub=1, cash_rub=0, max_participants=1, payment_link='https://x' WHERE id='20000000-0000-0000-0000-0000000000f1'$$,'paid_event_founder_only','admin: прямой UPDATE платных полей запрещён');
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,'Условия','https://qr.nspk.ru/x',null)->>'error'='forbidden','другой super_admin не включает оплату');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,2000,2,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','цена: предоплата+наличные должны = полной');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,0,5000,2,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','цена: предоплата > 0');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,null,null,null)$$,'schedules_paid_prices_chk','нужен QR или ссылка основателя');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,null,'javascript:alert(1)',null)$$,'schedules_paid_prices_chk','только https-ссылки');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000b9','paid',5000,2000,3000,2,120,null,'https://qr',null)->>'error'='not_club_event','интенсив нельзя сделать платным');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000d1','paid',5000,2000,3000,2,120,null,'https://qr',null)$$,'paid_event_has_legacy_registrations','free -> paid: одна legacy-запись блокирует конверсию');
SELECT pg_temp.raises($$SELECT paid_event_save('20000000-0000-0000-0000-0000000000d2','Legacy many paid',null,now()+interval '7 days',now()+interval '7 days 2 hours',null,null,null,'paid',5000,2000,3000,3,120,null,'https://qr',null)$$,'paid_event_has_legacy_registrations','free -> paid: много legacy-записей блокируют атомарную конверсию');
SELECT pg_temp.expect((SELECT booking_mode='free' AND count(*)=1 FROM schedules s JOIN schedule_participants sp ON sp.schedule_id=s.id WHERE s.id='20000000-0000-0000-0000-0000000000d1' GROUP BY booking_mode),'legacy 1 не изменено');
SELECT pg_temp.expect((SELECT booking_mode='free' AND count(*)=2 FROM schedules s JOIN schedule_participants sp ON sp.schedule_id=s.id WHERE s.id='20000000-0000-0000-0000-0000000000d2' GROUP BY booking_mode),'legacy many не изменено');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,3,120,'Условия','https://qr.nspk.ru/x',null)->>'ok'='true','free -> paid без записей: основатель approved=false может');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000cc','paid',1000,1000,0,1,30,null,null,'https://bank.example/pay')->>'ok'='true','основатель настраивает событие на 1 место');

-- Существенные поля, отключение и удаление paid-события: только founder+super_admin.
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT pg_temp.raises($$UPDATE schedules SET title='admin title' WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','admin не меняет title paid-события');
SELECT pg_temp.raises($$UPDATE schedules SET start_time=start_time+interval '1 hour' WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','admin не меняет start_time paid-события');
SELECT pg_temp.raises($$UPDATE schedules SET end_time=end_time+interval '1 hour' WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','admin не меняет end_time paid-события');
SELECT pg_temp.raises($$UPDATE schedules SET is_active=false WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','admin не отключает paid-событие');
SELECT pg_temp.raises($$DELETE FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','admin не удаляет paid-событие');
SET test.uid='00000000-0000-0000-0000-000000000008';
SELECT pg_temp.raises($$UPDATE schedules SET location='тренер' WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','trainer не меняет paid-событие');
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT pg_temp.raises($$UPDATE schedules SET color='#000000' WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_founder_only','другой super_admin не меняет paid-событие');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
UPDATE schedules SET title='Выезд founder', start_time=start_time+interval '10 minutes', end_time=end_time+interval '10 minutes', is_active=false
WHERE id='20000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.expect((SELECT title='Выезд founder' AND NOT is_active FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1'),'основатель меняет существенные поля и отключает paid-событие');
UPDATE schedules SET is_active=true WHERE id='20000000-0000-0000-0000-0000000000a1';
CREATE TEMP TABLE paid_delete_event AS
  SELECT paid_event_save(null,'Paid delete',null,now()+interval '9 days',now()+interval '9 days 1 hour',null,null,null,'paid',1000,1000,0,1,30,null,null,'https://bank.example/delete') AS r;
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT pg_temp.raises($$DELETE FROM schedules WHERE id=(SELECT (r->>'schedule_id')::uuid FROM paid_delete_event)$$,'paid_event_founder_only','admin не удаляет пустое paid-событие');
DELETE FROM schedules WHERE id='20000000-0000-0000-0000-0000000000fd';
SELECT pg_temp.expect(NOT EXISTS (SELECT 1 FROM schedules WHERE id='20000000-0000-0000-0000-0000000000fd'),'admin по-прежнему удаляет free-событие');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
DELETE FROM schedules WHERE id=(SELECT (r->>'schedule_id')::uuid FROM paid_delete_event);
SELECT pg_temp.expect(NOT EXISTS (SELECT 1 FROM schedules WHERE id=(SELECT (r->>'schedule_id')::uuid FROM paid_delete_event)),'основатель удаляет paid-событие без броней');

-- Обход: бот (service_role), admin, server_register_for_event, прямой INSERT
SET ROLE service_role; SET test.uid='';
SELECT pg_temp.raises($$INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000002')$$,'paid_event_requires_verified_booking','service_role прямой INSERT на платное отклонён');
SELECT pg_temp.raises($$SELECT server_register_for_event('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-0000000000a1')$$,'paid_event_requires_verified_booking','server_register_for_event на платное отклонён');
SELECT pg_temp.raises($$INSERT INTO paid_bookings(schedule_id,user_id,booking_status,payment_status,price_total_rub,prepay_rub,cash_rub,hold_expires_at,decided_by) VALUES ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000002','confirmed','verified',5000,2000,3000,now(),'bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e')$$,'permission denied','service_role не может подделать подтверждённую бронь');
SELECT pg_temp.raises($$UPDATE schedule_participants SET schedule_id='20000000-0000-0000-0000-0000000000a1' WHERE schedule_id='20000000-0000-0000-0000-0000000000f1' AND user_id='00000000-0000-0000-0000-000000000002'$$,'paid_event_requires_verified_booking','перенос записи на платное через UPDATE отклонён');
SET ROLE authenticated; SET test.uid='00000000-0000-0000-0000-000000000002';
SELECT pg_temp.raises($$SELECT register_for_event_web('20000000-0000-0000-0000-0000000000a1')$$,'paid_event_requires_verified_booking','register_for_event_web на платное отклонён');
SELECT pg_temp.raises($$INSERT INTO paid_bookings(schedule_id,user_id,price_total_rub,prepay_rub,cash_rub,hold_expires_at) VALUES ('20000000-0000-0000-0000-0000000000a1',auth.uid(),5000,2000,3000,now())$$,'permission denied','клиент не пишет paid_bookings напрямую');

-- Доступ резидента
SET test.uid='00000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-unapproved')->>'error'='forbidden','не одобренный резидент — отказ');
SET test.uid='00000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-intensive')->>'error'='forbidden','участник интенсива — отказ');
SELECT pg_temp.expect(paid_events_web()->>'error'='forbidden','интенсив не видит платные события');

-- Hold → «Я оплатил» → pending_review (не confirmed)
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000f1','key-free-0001')->>'error'='not_paid_event','бесплатное событие не бронируется через paid RPC');
CREATE TEMP TABLE h AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r1-00001') AS r;
SELECT pg_temp.expect((SELECT r->>'booking_status' FROM h)='hold','hold создан');
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r1-00001')->>'replayed'='true','повтор с тем же ключом — без дубля');
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r1-00002')->>'booking_id'=(SELECT r->>'booking_id' FROM h),'повторная заявка с новым ключом — та же бронь');
SELECT pg_temp.expect((SELECT count(*) FROM paid_bookings WHERE user_id=auth.uid())=1,'одна бронь на user+event');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id=auth.uid() AND schedule_id='20000000-0000-0000-0000-0000000000a1')=0,'hold не создаёт запись в календаре');
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h))->>'booking_status'='pending_review','«Я оплатил» → pending_review');
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h))->>'replayed'='true','повторное «Я оплатил» идемпотентно');
SELECT pg_temp.expect((SELECT payment_status='reported' AND booking_status<>'confirmed' FROM paid_bookings WHERE id=(SELECT (r->>'booking_id')::uuid FROM h)),'сообщение об оплате ≠ подтверждение');
SELECT pg_temp.expect(paid_bookings_admin_list('20000000-0000-0000-0000-0000000000a1')->>'error'='forbidden','резидент не открывает заявки');
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true)->>'error'='forbidden','резидент не подтверждает оплату');
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true)->>'error'='forbidden','admin не подтверждает оплату');
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true)->>'error'='forbidden','другой super_admin не подтверждает оплату');

-- Основатель подтверждает поступление; двойной callback идемпотентен
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true,'Сбер 12:40')->>'booking_status'='confirmed','основатель → confirmed');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*) FROM notification_stub_calls WHERE schedule_id='20000000-0000-0000-0000-0000000000a1' AND operation='INSERT'$q$)='1','confirm создаёт ровно 1 локальное INSERT-уведомление, без сети');
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true)->>'already_processed'='true','двойное подтверждение не меняет состояние');
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),false)->>'booking_status'='confirmed','поздний «Не поступил» не откатывает подтверждение');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000001' AND schedule_id='20000000-0000-0000-0000-0000000000a1' AND paid_booking_id IS NOT NULL)=1,'подтверждение создало ровно одну запись');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*) FROM paid_booking_ledger WHERE kind='prepay_verified' AND amount_rub=2000$q$)='1','в журнале одна проверенная предоплата 2000');
SELECT pg_temp.expect((SELECT attended=false AND attended_marked_at IS NULL FROM schedule_participants WHERE paid_booking_id IS NOT NULL),'оплата не отмечает посещение (совместимо с «Отметками»)');
-- наличные
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),4000,'cash-req-0001')->>'error'='invalid_amount','наличные не больше остатка');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),1000,'cash-req-0002')->>'cash_remaining_rub'='2000','частичная оплата наличными: 1000, остаток 2000');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),1000,'cash-req-0002')->>'already_processed'='true','повтор той же кнопки наличных без дубля');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),2500,'cash-req-0003')->>'error'='invalid_amount','доплата не больше остатка');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),2000,'cash-req-0004')->>'cash_remaining_rub'='0','доплата 2000 закрыла остаток');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),1,'cash-req-0005')->>'error'='invalid_amount','сверх полной суммы наличных нельзя');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*)||'/'||sum(amount_rub) FROM paid_booking_ledger WHERE kind='cash_received'$q$)='2/3000','наличные: две записи на 3000');

-- Удаление подтверждённой записи в обход: резидент, бот
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.raises($$DELETE FROM schedule_participants WHERE paid_booking_id IS NOT NULL$$,'paid_registration_cancel_via_founder','резидент не удаляет оплаченную запись напрямую');
SELECT pg_temp.expect(paid_booking_cancel_own((SELECT (r->>'booking_id')::uuid FROM h))->>'error'='contact_founder','подтверждённую бронь отменяет основатель');
SET ROLE service_role;
SELECT pg_temp.raises($$DELETE FROM schedule_participants WHERE paid_booking_id IS NOT NULL$$,'paid_registration_cancel_via_founder','бот не удаляет оплаченную запись');
SELECT pg_temp.raises($$UPDATE paid_bookings SET booking_status='cancelled'$$,'permission denied','бот не меняет статус брони');
SET ROLE authenticated;

-- Hold timeout и освобождение места
SET test.uid='00000000-0000-0000-0000-000000000002';
CREATE TEMP TABLE h2 AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r2-00001') AS r;
SELECT pg_temp.expect((SELECT r->>'booking_status' FROM h2)='hold','второй резидент — active hold');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$UPDATE schedules SET max_participants=1 WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_capacity_below_reserved','capacity нельзя снизить ниже confirmed + active hold');
UPDATE schedules SET max_participants=2 WHERE id='20000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.expect((SELECT max_participants=2 FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1'),'capacity можно снизить ровно до занятых мест');
SET test.uid='00000000-0000-0000-0000-000000000002';
RESET ROLE; UPDATE paid_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=(SELECT (r->>'booking_id')::uuid FROM h2); SET ROLE authenticated;
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h2))->>'error'='hold_expired','просроченный hold не принимает «Я оплатил»');
SELECT pg_temp.expect((SELECT booking_status FROM paid_bookings WHERE id=(SELECT (r->>'booking_id')::uuid FROM h2))='expired','hold истёк');
CREATE TEMP TABLE h3 AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r2-00002') AS r;
SELECT pg_temp.expect((SELECT r->>'booking_status' FROM h3)='hold','после истечения можно забронировать снова');
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h3))->>'booking_status'='pending_review','второй → pending_review');
-- лимит мест: pending_review занимает место
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$UPDATE schedules SET max_participants=1 WHERE id='20000000-0000-0000-0000-0000000000a1'$$,'paid_event_capacity_below_reserved','capacity нельзя снизить ниже confirmed + pending_review');
SET test.uid='00000000-0000-0000-0000-000000000007';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r3-00001')->>'error'='no_seats','confirmed и pending_review занимают все места');
-- пользователь отменяет после сообщения об оплате → основатель решает возврат
SET test.uid='00000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(paid_booking_cancel_own((SELECT (r->>'booking_id')::uuid FROM h3))->>'error'='under_review','после «Я оплатил» участник не отменяет сам');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM h3),true,'Участник передумал')->>'refundable_rub'='0','отмена при «со слов участника»: возвращать нечего');
UPDATE schedules SET max_participants=1 WHERE id='20000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.expect((SELECT max_participants=1 FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1'),'capacity можно безопасно снизить после отмены pending_review');
UPDATE schedules SET max_participants=3 WHERE id='20000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.expect((SELECT max_participants=3 FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1'),'capacity можно увеличить');
SELECT pg_temp.expect((SELECT payment_status FROM paid_bookings WHERE id=(SELECT (r->>'booking_id')::uuid FROM h3))='reported','«reported» не становится «нужен возврат»');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h3),2000,'попытка','refund-h3-01')->>'error'='refund_not_pending','нельзя вернуть по одному заявлению участника');
SELECT pg_temp.expect(paid_booking_record_late_payment((SELECT (r->>'booking_id')::uuid FROM h3),2000,'Пришло в Сбер после отмены','late-h3-001')->>'payment_status'='refund_pending','позднее поступление на отменённую бронь → нужен возврат');
SELECT pg_temp.expect(paid_booking_record_late_payment((SELECT (r->>'booking_id')::uuid FROM h3),2000,'дубль','late-h3-001')->>'already_processed'='true','повтор позднего поступления без дубля');
SELECT pg_temp.expect((SELECT booking_status FROM paid_bookings WHERE id=(SELECT (r->>'booking_id')::uuid FROM h3))='cancelled','позднее поступление не восстанавливает бронь');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h3),2000,'Возврат позднего платежа','refund-h3-02')->>'payment_status'='refunded','позднее поступление возвращено');
SET test.uid='00000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000cc','key-r2-00001')->>'error'='idempotency_conflict','тот же ключ для другого события → конфликт');
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r2-00001')->>'booking_status'='expired','повтор ключа истёкшей брони возвращает тот же (истёкший) результат');

-- Отмена основателем подтверждённой брони и возврат: аудит, история сохраняется
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM h),true,'')->>'error'='note_required','отмена основателем требует причину');
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM h),true,'Перенос по болезни')->>'booking_status'='cancelled','основатель отменил подтверждённую бронь');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE paid_booking_id=(SELECT (r->>'booking_id')::uuid FROM h))=0,'запись в календаре снята');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*) FROM notification_stub_calls WHERE schedule_id='20000000-0000-0000-0000-0000000000a1' AND operation='DELETE'$q$)='1','cancel создаёт ровно 1 локальное DELETE-уведомление, без сети');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),6000,'Возврат СБП','refund-h-001')->>'error'='refund_exceeds_received','возврат больше полученного (5000) отклонён');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),2000,'','refund-h-001')->>'error'='note_required','возврат без причины отклонён');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),2000,'Возврат СБП','refund-h-001')->>'payment_status'='partially_refunded','частичный возврат 2000');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),2000,'дубль','refund-h-001')->>'already_processed'='true','двойное нажатие возврата без дубля');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),3001,'Остаток','refund-h-002')->>'error'='refund_exceeds_received','остаток возврата не больше 3000');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),3000,'Остаток наличными','refund-h-003')->>'payment_status'='refunded','остаток возврата 3000 → полностью возвращено');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT string_agg(kind, ',' ORDER BY id) FROM paid_booking_ledger WHERE booking_id=(SELECT (r->>'booking_id')::uuid FROM h)$q$)
  ='hold_created,prepay_reported,prepay_verified,cash_received,cash_received,cancelled_by_founder,refund_marked_pending,refund_issued,refund_issued','полный аудит брони в журнале');
RESET ROLE;
SELECT pg_temp.raises($$UPDATE paid_booking_ledger SET amount_rub=0$$,'append-only','журнал нельзя изменить');
SELECT pg_temp.raises($$DELETE FROM paid_bookings$$,'cannot be deleted','историю броней нельзя удалить');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE schedule_id IN ('20000000-0000-0000-0000-0000000000d1','20000000-0000-0000-0000-0000000000d2'))=3,'legacy-записи остались на free-событиях');

-- «Не поступил»
SET ROLE authenticated; SET test.uid='00000000-0000-0000-0000-000000000007';
CREATE TEMP TABLE h4 AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r3-00002') AS r;
SELECT paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h4));
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h4),false,'нет в выписке')->>'booking_status'='rejected','«Не поступил» → rejected');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000007')=0,'rejected не создаёт запись');
-- снять «платно» с активными бронями нельзя
SET test.uid='00000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE active_hold AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r1-00009') AS r;
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','free',null,null,null,null,null,null,null,null)$$,'paid_event_has_active_bookings','нельзя выключить оплату при активных бронях');
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM active_hold),false,'Закрытие теста')->>'booking_status'='cancelled','активная hold закрыта');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','free',null,null,null,null,null,null,null,null)->>'ok'='true','paid -> free разрешено после закрытия всех активных броней');
SELECT pg_temp.expect((SELECT booking_mode='free' FROM schedules WHERE id='20000000-0000-0000-0000-0000000000a1') AND (SELECT count(*)>0 FROM paid_bookings WHERE schedule_id='20000000-0000-0000-0000-0000000000a1'),'free-событие сохраняет прошлую paid-историю');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,3,120,'Условия','https://qr.nspk.ru/x',null)->>'ok'='true','повторное free -> paid с прошлой paid-историей, но без schedule_participants, разрешено');

-- P0-1: режим каждого события клуба известен клиенту
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(paid_events_web()->'modes'->>'20000000-0000-0000-0000-0000000000f1'='free' AND paid_events_web()->'modes'->>'20000000-0000-0000-0000-0000000000a1'='paid','modes: режим для каждого события клуба');
SELECT pg_temp.expect(NOT (paid_events_web()->'modes') ? '20000000-0000-0000-0000-0000000000b9','modes: события интенсива не попадают');
-- P0-2: атомарное создание/правка
SELECT pg_temp.expect(paid_event_save(null,'Выезд 2',null,now()+interval '9 days',now()+interval '9 days 2 hours',null,'#10b981',null,'paid',5000,2000,3000,5,120,null,'https://qr',null)->>'error'='forbidden','резидент не создаёт событие');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
CREATE TEMP TABLE cnt AS SELECT count(*) AS n FROM schedules;
SELECT pg_temp.raises($$SELECT paid_event_save(null,'Выезд 2',null,now()+interval '9 days',now()+interval '9 days 2 hours',null,'#10b981',null,'paid',5000,2000,2000,5,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','ошибка цены при создании отклоняет весь вызов');
SELECT pg_temp.expect((SELECT count(*) FROM schedules)=(SELECT n FROM cnt),'при ошибке настроек событие не создано (нет бесплатной публикации)');
CREATE TEMP TABLE ns AS SELECT paid_event_save(null,'Выезд 2','Тема|||Текст',now()+interval '9 days',now()+interval '9 days 2 hours','Казань','#10b981',null,'paid',5000,2000,3000,5,120,'Условия','https://qr',null) AS r;
SELECT pg_temp.expect((SELECT is_active AND booking_mode='paid' AND schedule_type='club' AND max_participants=5 FROM schedules WHERE id=(SELECT (r->>'schedule_id')::uuid FROM ns)),'платное событие создано сразу платным');
SELECT pg_temp.raises($$SELECT paid_event_save((SELECT (r->>'schedule_id')::uuid FROM ns),'Выезд 2 новое',null,now()+interval '10 days',now()+interval '10 days 2 hours',null,'#10b981',null,'paid',5000,0,5000,5,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','ошибка цены при правке отклоняет весь вызов');
SELECT pg_temp.expect((SELECT title='Выезд 2' AND start_time < now()+interval '9 days 1 hour' FROM schedules WHERE id=(SELECT (r->>'schedule_id')::uuid FROM ns)),'при ошибке правки дата/название не изменились');
SELECT pg_temp.expect(paid_event_save('20000000-0000-0000-0000-0000000000b9','x',null,now()+interval '1 day',now()+interval '1 day 1 hour',null,null,null,'paid',5000,2000,3000,5,120,null,'https://qr',null)->>'error'='not_club_event','paid_event_save не трогает интенсив');
SET test.uid='00000000-0000-0000-0000-000000000005';
UPDATE schedules SET title='Бесплатное (правка)' WHERE id='20000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.expect((SELECT title FROM schedules WHERE id='20000000-0000-0000-0000-0000000000f1')='Бесплатное (правка)','обычная правка бесплатного события как раньше');
-- anon
SET ROLE anon;
SELECT pg_temp.raises($$SELECT paid_events_web()$$,'permission denied','anon не вызывает RPC');
RESET ROLE;
