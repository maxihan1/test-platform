-- 윈도우 PC 게임 빌드 — 빌드 표의 플랫폼 칸 · 실행에 고정하는 PC 빌드 (docs/spec/공통/4-데이터모델.md 「윈도우 PC 빌드」 · GAME-F4-03)

-- migrate:up

-- 서버가 zip 목차로 가른다. 웹 · API 빌드(파일 없음)도 'android' 로 남는다 — 실행이 그 빌드를 깔지 않아 뜻이 없다
ALTER TABLE app_build ADD COLUMN platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'windows'));
-- 유일성 · 최신 빌드 · 보관 개수를 플랫폼마다로 — CI 한 바퀴가 APK 와 윈도우 zip 을 같은 번호로 올린다
ALTER TABLE app_build DROP CONSTRAINT app_build_service_id_env_build_no_key;
ALTER TABLE app_build ADD UNIQUE (service_id, env, platform, build_no);
DROP INDEX app_build_service_id_env_uploaded_at_idx;
CREATE INDEX ON app_build (service_id, env, platform, uploaded_at DESC);
-- build_id 는 지금처럼 폰 빌드다. PC 빌드로 건 빌드 실행은 build_id 가 비고 이 칸이 그 실행의 빌드다
ALTER TABLE test_run
  ADD COLUMN pc_build_id BIGINT REFERENCES app_build(id) ON DELETE SET NULL,
  ADD COLUMN pc_build_no TEXT;

-- migrate:down

ALTER TABLE test_run DROP COLUMN pc_build_no, DROP COLUMN pc_build_id;
DELETE FROM app_build WHERE platform = 'windows';
DROP INDEX app_build_service_id_env_platform_uploaded_at_idx;
CREATE INDEX ON app_build (service_id, env, uploaded_at DESC);
ALTER TABLE app_build DROP CONSTRAINT app_build_service_id_env_platform_build_no_key;
ALTER TABLE app_build ADD UNIQUE (service_id, env, build_no);
ALTER TABLE app_build DROP COLUMN platform;
