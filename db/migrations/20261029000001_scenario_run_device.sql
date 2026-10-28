-- 앱 · 게임 단계가 있는 E2E 시나리오 실행을 돌린 폰 · 앱의 판 (도메인/시나리오 §3.7 결정 16 · 진행판 E2E-F3-03)
-- 칸은 docs/spec/공통/4-데이터모델.md 「기기 칸」을 따른다

-- migrate:up

-- { model, osVersion, appVersion, appBuild? } — run_item.device 와 같은 모양이다. 케이스 실행 · 웹만의 시나리오 · 폰 연결이 안 열린 시나리오는 NULL 이다
ALTER TABLE test_run ADD COLUMN device JSONB CHECK (device IS NULL OR jsonb_typeof(device) = 'object');

-- migrate:down

ALTER TABLE test_run DROP COLUMN IF EXISTS device;
