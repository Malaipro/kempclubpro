#!/usr/bin/env bash
# ============================================================================
# sql/resident-rewards/test-local.sh — прогон приёмочных тестов наград КЭМП.
# ТОЛЬКО локальный синтетический стенд. По умолчанию — Docker-стенд Supabase
# (postgresql://postgres:postgres@127.0.0.1:55322/postgres). Переопределение:
#   KEMP_TEST_DB_URL=postgresql://... ./test-local.sh
# Скрипт применяет test-fixture.sql и up.sql к ЦЕЛЕВОЙ БД — никогда не
# указывать рабочую БД.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")"

DB_URL="${KEMP_TEST_DB_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"

case "$DB_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "ОТКАЗ: KEMP_TEST_DB_URL должен указывать на локальную БД (127.0.0.1/localhost)." >&2; exit 1;;
esac

echo "== 1/4 fixture =="
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f test-fixture.sql

echo "== 2/4 up.sql (staging) =="
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f up.sql

echo "== 3/4 последовательные приёмочные сценарии =="
psql "$DB_URL" -v ON_ERROR_STOP=1 -f test-acceptance.sql

echo "== 4/4 параллельные подтверждения (сценарий 6) =="
FOUNDER_ID=$(psql "$DB_URL" -tAc "SELECT id FROM auth.users WHERE email='admin.pr10@example.test'")
R2='22222222-2222-4222-8222-222222222202'
R3='33333333-3333-4333-8333-333333333303'

confirm() { # <schedule_id> <user_id> <attended>
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '$FOUNDER_ID', 'role', 'authenticated')::text, true);
SELECT public.founder_confirm_attendance('$1', jsonb_build_array(jsonb_build_object('user_id', '$2', 'attended', $3)));
COMMIT;
SQL
}

# 6a: два параллельных подтверждения одного события одному участнику.
# Отдельные события недели 2026-11-23 (E1 перенесён, E2 деактивировано в T9/T10).
E1='11111111-1111-4111-8111-111111111105'
E2='11111111-1111-4111-8111-111111111106'
E3='11111111-1111-4111-8111-111111111107'
psql "$DB_URL" -q <<SQL
DELETE FROM public.schedules WHERE id IN ('$E1','$E2','$E3');
INSERT INTO public.schedules (id, title, activity_type, start_time, end_time, schedule_type, club_kind, booking_mode, is_active)
VALUES
  ('$E1', 'БЖЖ (гонка)', 'БЖЖ', '2026-11-23 06:00:00+03', '2026-11-23 07:30:00+03', 'club', 'training_bjj', 'free', true),
  ('$E2', 'ОФП (гонка)', 'ОФП', '2026-11-25 06:00:00+03', '2026-11-25 07:30:00+03', 'club', 'training_ofp', 'free', true),
  ('$E3', 'Кикбоксинг (гонка)', 'Кикбоксинг', '2026-11-27 06:00:00+03', '2026-11-27 07:30:00+03', 'club', 'training_kick', 'free', true);
INSERT INTO public.schedule_participants (schedule_id, user_id) VALUES ('$E1','$R2'), ('$E2','$R2'), ('$E3','$R2'), ('$E1','$R3'), ('$E2','$R3'), ('$E3','$R3') ON CONFLICT DO NOTHING;
SQL

confirm "$E1" "$R2" true & P1=$!
confirm "$E1" "$R2" true & P2=$!
wait $P1 $P2

AW=$(psql "$DB_URL" -tAc "SELECT count(*) FROM resident_reward_awards WHERE award_kind='training' AND user_id='$R2' AND schedule_id='$E1'")
[ "$AW" = "1" ] && echo "PASS 6a: ровно одна награда за (r2,E1) при гонке" || { echo "FAIL 6a: наград=$AW"; exit 1; }

# 6b: два параллельных подтверждения разных событий одной недели (r3).
confirm "$E1" "$R3" true
confirm "$E2" "$R3" true & P1=$!
confirm "$E3" "$R3" true & P2=$!
wait $P1 $P2

WK=$(psql "$DB_URL" -tAc "SELECT count(*) FROM resident_reward_awards WHERE award_kind='week_full' AND user_id='$R3'")
COINS=$(psql "$DB_URL" -tAc "SELECT COALESCE(sum(amount),0) FROM coin_transactions WHERE user_id='$R3'")
PTS=$(psql "$DB_URL" -tAc "SELECT COALESCE(sum(points),0) FROM resident_reward_awards WHERE user_id='$R3' AND status='active'")
[ "$WK" = "1" ] && echo "PASS 6b: один недельный бонус при гонке" || { echo "FAIL 6b: недельных наград=$WK"; exit 1; }
[ "$COINS" = "70" ] && echo "PASS 6b: коины=70" || { echo "FAIL 6b: коины=$COINS"; exit 1; }
[ "$PTS" = "40" ] && echo "PASS 6b: баллы=40" || { echo "FAIL 6b: баллы=$PTS"; exit 1; }

echo "ALL TESTS PASSED"
