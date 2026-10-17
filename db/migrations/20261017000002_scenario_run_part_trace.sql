-- E2E 실패 부품의 네트워크 · 조작 · 콘솔 — 가린 뒤 넣는다 (도메인/시나리오 §7 「실패 기록」)
-- 칸은 scenario_run_part 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 실패한 case 부품만 찬다. { status, reason, network, actions, console } — 케이스 항목 상세의 trace 와 같은 모양이다
ALTER TABLE scenario_run_part ADD COLUMN trace JSONB;

-- migrate:down

ALTER TABLE scenario_run_part DROP COLUMN IF EXISTS trace;
