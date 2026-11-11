-- Изолированная проверка E1 paid-bookings на локальной пустой БД (НЕ production).
\set ON_ERROR_STOP on
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
CREATE TYPE schedule_type AS ENUM ('intensive','club');
CREATE TABLE profiles(user_id uuid PRIMARY KEY, participant_status text, approved boolean, display_name text, first_name text, last_name text);
CREATE TABLE user_roles(user_id uuid, role text);
CREATE TABLE schedules(id uuid PRIMARY KEY, title text, activity_type text, description text, start_time timestamptz, is_active boolean DEFAULT true,
  schedule_type schedule_type, max_participants integer, updated_at timestamptz DEFAULT now());
CREATE TABLE schedule_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE, user_id uuid,
  registered_at timestamptz DEFAULT now(), attended boolean DEFAULT false, UNIQUE(schedule_id,user_id));
CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION is_club_resident(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id=_u AND participant_status='club_resident' AND approved) $$;
CREATE FUNCTION is_super_admin(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_u AND role='super_admin') $$;
-- как на live: клиентам разрешён прямой INSERT, service_role обходит RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_participants TO authenticated;
GRANT SELECT, UPDATE ON schedules TO authenticated;
GRANT ALL ON schedule_participants, schedules TO service_role;
CREATE FUNCTION server_register_for_event(p_uid uuid,p_sid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO schedule_participants(schedule_id,user_id) VALUES(p_sid,p_uid); RETURN jsonb_build_object('ok',true); END $$;
CREATE FUNCTION register_for_event_web(p_schedule_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN public.server_register_for_event(auth.uid(),p_schedule_id); END $$;

INSERT INTO profiles VALUES
 ('bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e','club_resident',false,'Основатель',null,null),
 ('00000000-0000-0000-0000-000000000001','club_resident',true,'Резидент',null,null),
 ('00000000-0000-0000-0000-000000000002','club_resident',true,'Резидент 2',null,null),
 ('00000000-0000-0000-0000-000000000003','club_resident',false,'Не одобрен',null,null),
 ('00000000-0000-0000-0000-000000000004','intensive_active',true,'Интенсив',null,null);
INSERT INTO user_roles VALUES ('bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e','super_admin'),('00000000-0000-0000-0000-000000000005','admin'),('00000000-0000-0000-0000-000000000006','super_admin');
INSERT INTO schedules(id,title,activity_type,start_time,schedule_type,max_participants) VALUES
 ('20000000-0000-0000-0000-0000000000f1','Бесплатное','БЖЖ',now()+interval '2 days','club',null),
 ('20000000-0000-0000-0000-0000000000a1','Выезд','Выезд',now()+interval '5 days','club',2),
 ('20000000-0000-0000-0000-0000000000cc','Последнее место','Баня',now()+interval '5 days','club',1),
 ('20000000-0000-0000-0000-0000000000b9','Интенсив','BJJ',now()+interval '2 days','intensive',10);
-- legacy запись на событие, которое позже станет платным, должна сохраниться
INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000004');

-- E1 зависит от resident-checkins: применяем обе миграции по порядку
\i sql/resident-checkins/up.sql
\i sql/paid-bookings/up.sql

CREATE FUNCTION pg_temp.expect(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'OK: %', label; END $$;
CREATE FUNCTION pg_temp.raises(stmt text, expected text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE stmt; RAISE EXCEPTION 'FAIL: % (no error)', label;
EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' OR (expected IS NOT NULL AND SQLERRM NOT LIKE '%'||expected||'%') THEN RAISE EXCEPTION 'FAIL: % got %', label, SQLERRM; END IF; RAISE NOTICE 'OK: %', label; END $$;
CREATE FUNCTION pg_temp.lq(q text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE r text; BEGIN EXECUTE q INTO r; RETURN r; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.lq(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION pg_temp.expect(boolean,text), pg_temp.raises(text,text,text) TO PUBLIC;

SELECT pg_temp.expect((SELECT bool_and(booking_mode='free') FROM schedules),'существующие события остались free');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants)=1,'legacy-записи сохранены');

-- Бесплатное событие: прежнее поведение
SET ROLE authenticated; SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(register_for_event_web('20000000-0000-0000-0000-0000000000f1')->>'ok'='true','free: register_for_event_web как раньше');
INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('20000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect(true,'free: прямой INSERT как раньше');

-- Настройки: только основатель
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,'Условия','https://qr.nspk.ru/x',null)->>'error'='forbidden','резидент не включает оплату');
SELECT pg_temp.raises($$UPDATE schedules SET booking_mode='paid', price_total_rub=1, prepay_rub=1, cash_rub=0, max_participants=1, payment_link='https://x' WHERE id='20000000-0000-0000-0000-0000000000f1'$$,'paid_settings_founder_only','прямой UPDATE платных полей запрещён');
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,'Условия','https://qr.nspk.ru/x',null)->>'error'='forbidden','другой super_admin не включает оплату');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,2000,2,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','цена: предоплата+наличные должны = полной');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,0,5000,2,120,null,'https://qr',null)$$,'schedules_paid_prices_chk','цена: предоплата > 0');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,null,null,null)$$,'schedules_paid_prices_chk','нужен QR или ссылка основателя');
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,2,120,null,'javascript:alert(1)',null)$$,'schedules_paid_prices_chk','только https-ссылки');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000b9','paid',5000,2000,3000,2,120,null,'https://qr',null)->>'error'='not_club_event','интенсив нельзя сделать платным');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','paid',5000,2000,3000,3,120,'Условия','https://qr.nspk.ru/x',null)->>'ok'='true','основатель (approved=false) включает оплату');
SELECT pg_temp.expect(paid_event_settings_save('20000000-0000-0000-0000-0000000000cc','paid',1000,1000,0,1,30,null,null,'https://bank.example/pay')->>'ok'='true','основатель настраивает событие на 1 место');

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
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),true)->>'already_processed'='true','двойное подтверждение не меняет состояние');
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h),false)->>'booking_status'='confirmed','поздний «Не поступил» не откатывает подтверждение');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000001' AND schedule_id='20000000-0000-0000-0000-0000000000a1' AND paid_booking_id IS NOT NULL)=1,'подтверждение создало ровно одну запись');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*) FROM paid_booking_ledger WHERE kind='prepay_verified' AND amount_rub=2000$q$)='1','в журнале одна проверенная предоплата 2000');
SELECT pg_temp.expect((SELECT attended=false AND attended_marked_at IS NULL FROM schedule_participants WHERE paid_booking_id IS NOT NULL),'оплата не отмечает посещение (совместимо с «Отметками»)');
-- наличные
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),4000)->>'error'='invalid_amount','наличные не больше остатка');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),3000)->>'cash_received_rub'='3000','наличные остатка 3000 отмечены');
SELECT pg_temp.expect(paid_booking_mark_cash((SELECT (r->>'booking_id')::uuid FROM h),3000)->>'already_processed'='true','повтор отметки наличных без дубля');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT count(*) FROM paid_booking_ledger WHERE kind='cash_received'$q$)='1','наличные учтены отдельно один раз');

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
SELECT pg_temp.expect((SELECT r->>'booking_status' FROM h2)='hold','второй резидент — hold (занято 3/3: legacy + confirmed + hold)');
RESET ROLE; UPDATE paid_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=(SELECT (r->>'booking_id')::uuid FROM h2); SET ROLE authenticated;
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h2))->>'error'='hold_expired','просроченный hold не принимает «Я оплатил»');
SELECT pg_temp.expect((SELECT booking_status FROM paid_bookings WHERE id=(SELECT (r->>'booking_id')::uuid FROM h2))='expired','hold истёк');
CREATE TEMP TABLE h3 AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r2-00002') AS r;
SELECT pg_temp.expect((SELECT r->>'booking_status' FROM h3)='hold','после истечения можно забронировать снова');
SELECT pg_temp.expect(paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h3))->>'booking_status'='pending_review','второй → pending_review');
-- лимит мест: pending_review занимает место
RESET ROLE; INSERT INTO profiles VALUES ('00000000-0000-0000-0000-000000000007','club_resident',true,'Резидент 3',null,null); SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000007';
SELECT pg_temp.expect(paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r3-00001')->>'error'='no_seats','pending_review и legacy занимают места');
-- пользователь отменяет после сообщения об оплате → основатель решает возврат
SET test.uid='00000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect(paid_booking_cancel_own((SELECT (r->>'booking_id')::uuid FROM h3))->>'payment_status'='reported','отмена после «Я оплатил» сохраняет признак оплаты');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT (note IS NOT NULL)::text FROM paid_booking_ledger WHERE kind='cancelled_by_user'$q$)='true','отмена с пометкой для проверки возврата');

-- Отмена основателем подтверждённой брони и возврат: аудит, история сохраняется
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM h),true,'')->>'error'='note_required','отмена основателем требует причину');
SELECT pg_temp.expect(paid_booking_founder_cancel((SELECT (r->>'booking_id')::uuid FROM h),true,'Перенос по болезни')->>'booking_status'='cancelled','основатель отменил подтверждённую бронь');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE paid_booking_id=(SELECT (r->>'booking_id')::uuid FROM h))=0,'запись в календаре снята');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),2000,'Возврат СБП')->>'payment_status'='refunded','возврат отмечен');
SELECT pg_temp.expect(paid_booking_mark_refunded((SELECT (r->>'booking_id')::uuid FROM h),2000,'дубль')->>'already_processed'='true','повтор возврата без дубля');
SELECT pg_temp.expect(pg_temp.lq($q$SELECT string_agg(kind, ',' ORDER BY id) FROM paid_booking_ledger WHERE booking_id=(SELECT (r->>'booking_id')::uuid FROM h)$q$)
  ='hold_created,prepay_reported,prepay_verified,cash_received,cancelled_by_founder,refund_marked_pending,refund_issued','полный аудит брони в журнале');
RESET ROLE;
SELECT pg_temp.raises($$UPDATE paid_booking_ledger SET amount_rub=0$$,'append-only','журнал нельзя изменить');
SELECT pg_temp.raises($$DELETE FROM paid_bookings$$,'cannot be deleted','историю броней нельзя удалить');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000004')=1,'legacy-запись на платном событии сохранена');

-- «Не поступил»
SET ROLE authenticated; SET test.uid='00000000-0000-0000-0000-000000000007';
CREATE TEMP TABLE h4 AS SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r3-00002') AS r;
SELECT paid_booking_report_paid((SELECT (r->>'booking_id')::uuid FROM h4));
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.expect(paid_booking_decide((SELECT (r->>'booking_id')::uuid FROM h4),false,'нет в выписке')->>'booking_status'='rejected','«Не поступил» → rejected');
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000007')=0,'rejected не создаёт запись');
-- снять «платно» с активными бронями нельзя
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT paid_booking_create_hold('20000000-0000-0000-0000-0000000000a1','key-r1-00009');
SET test.uid='bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
SELECT pg_temp.raises($$SELECT paid_event_settings_save('20000000-0000-0000-0000-0000000000a1','free',null,null,null,null,null,null,null,null)$$,'paid_event_has_active_bookings','нельзя выключить оплату при активных бронях');
-- anon
SET ROLE anon;
SELECT pg_temp.raises($$SELECT paid_events_web()$$,'permission denied','anon не вызывает RPC');
RESET ROLE;
