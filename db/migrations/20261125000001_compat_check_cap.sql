-- 호환성 화면 점검이 연결 하나의 화면 수 상한에 걸린 때 돌던 케이스 줄에 그 상한을 남긴다 (도메인/호환성 §3.13 「테스트 프로시저」 · TP-F6-33)
-- 더하기만 한다. 안 걸렸거나 이 칸 전의 줄은 NULL 이다

-- migrate:up

ALTER TABLE compat_run_case ADD COLUMN check_cap INTEGER CHECK (check_cap > 0);

-- migrate:down

ALTER TABLE compat_run_case DROP COLUMN check_cap;
