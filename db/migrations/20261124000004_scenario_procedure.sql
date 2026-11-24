-- E2E 프로시저 단계 — 앱 · 게임 단계의 케이스가 프로시저 안 케이스면 그 프로시저가 통째로 돈다. 돈 프로시저와 케이스마다의 박제 · 결과를 단계 줄에 같이 둔다
-- 절차 줄에는 그 절차가 든 케이스를 싣는다 (도메인/시나리오 §3.7 결정 17 · 공통/4 「주변 기능이 더하는 칸」 · TP-F4-24)
-- 더하기만 한다. 옛 꼴 케이스 단계 · 다른 부품 · 옛 줄은 셋 다 NULL 이다

-- migrate:up

ALTER TABLE scenario_run_part ADD COLUMN proc_id TEXT, ADD COLUMN proc_name TEXT, ADD COLUMN cases JSONB;
ALTER TABLE scenario_run_step ADD COLUMN tc_id TEXT;

-- migrate:down

ALTER TABLE scenario_run_step DROP COLUMN tc_id;
ALTER TABLE scenario_run_part DROP COLUMN proc_id, DROP COLUMN proc_name, DROP COLUMN cases;
