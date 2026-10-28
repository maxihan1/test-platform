-- E2E 시나리오 디바이스에 android(Android 앱 · 게임 시작 애플리케이션)를 더한다 (진행판 E2E-F3-01)
-- 칸은 docs/spec/공통/4-데이터모델.md 「E2E 시나리오 표」와 도메인/시나리오 §3.7 결정 16 을 따른다

-- migrate:up

ALTER TABLE scenario_version DROP CONSTRAINT scenario_version_platform_check;
ALTER TABLE scenario_version ADD CONSTRAINT scenario_version_platform_check CHECK (platform IN ('desktop','mobile','android'));

-- migrate:down

-- android 버전이 한 줄이라도 저장된 뒤에는 아래 CHECK 가 그 줄에 걸려 되돌리기가 실패한다 — 버전은 고치지 않는 이력이라 지우거나 바꾸지 않는다
ALTER TABLE scenario_version DROP CONSTRAINT scenario_version_platform_check;
ALTER TABLE scenario_version ADD CONSTRAINT scenario_version_platform_check CHECK (platform IN ('desktop','mobile'));
