-- SPEC §6 개정분. 서비스·계정 표를 새로 만들고 실행 기록에 박제할 칸을 더한다.
-- 본문은 §6의 SQL 예시를 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- ── 1. 서비스와 계정 ──────────────────────────────────────────────
CREATE TABLE service (
  id         BIGSERIAL PRIMARY KEY,
  prefix     TEXT        UNIQUE NOT NULL,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL,
  tests_repo TEXT        NOT NULL,
  tests_dir  TEXT        NOT NULL,
  slack_webhook TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE service_env (
  service_id BIGINT NOT NULL REFERENCES service(id),
  env        TEXT   NOT NULL,
  base_url   TEXT   NOT NULL,
  PRIMARY KEY (service_id, env)
);
CREATE TABLE app_user (
  username      TEXT PRIMARY KEY,
  display_name  TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'viewer',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_service (
  username   TEXT   NOT NULL REFERENCES app_user(username),
  service_id BIGINT NOT NULL REFERENCES service(id),
  PRIMARY KEY (username, service_id)
);

-- ── 2. test_run 스냅샷 ────────────────────────────────────────────
ALTER TABLE test_run ALTER COLUMN env DROP DEFAULT;
ALTER TABLE test_run
  ADD COLUMN service_id        BIGINT REFERENCES service(id),
  ADD COLUMN service_name      TEXT NOT NULL DEFAULT '',
  ADD COLUMN tests_repo        TEXT NOT NULL DEFAULT '',
  ADD COLUMN base_url          TEXT NOT NULL DEFAULT '',
  ADD COLUMN triggered_by_name TEXT;
ALTER TABLE test_run
  ADD COLUMN notify_slack BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notified_at  TIMESTAMPTZ;
-- notify_slack 은 기본값을 남긴다. 옛 행과 알림을 안 쓰는 실행이 둘 다 false 로 옳다
ALTER TABLE test_run ALTER COLUMN service_name DROP DEFAULT;
ALTER TABLE test_run ALTER COLUMN tests_repo   DROP DEFAULT;
ALTER TABLE test_run ALTER COLUMN base_url     DROP DEFAULT;
-- 서비스 칸을 반만 채우는 것을 막는다. 둘 다 비면 통합 이전 행, 둘 다 차면 정상.
-- service_name 의 DEFAULT 를 뺐으므로 새 INSERT 가 빠뜨리면 NOT NULL 로 그 자리에서 실패한다
ALTER TABLE test_run ADD CONSTRAINT test_run_service_pair
  CHECK ((service_id IS NULL) = (service_name = ''));

-- ── 3. run_item 스냅샷 ────────────────────────────────────────────
ALTER TABLE run_item
  ADD COLUMN attempt         INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN file_path       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN param_schema    JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN expected_schema JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN param_set_id    BIGINT,
  ADD COLUMN timeout_ms      INTEGER;
ALTER TABLE run_item ALTER COLUMN file_path DROP DEFAULT;
-- 2026-09-17 결정. 라벨 두 칸의 기본값도 뺀다. 이 둘은 증적 라벨의 유일한 원천이라
-- INSERT 가 빠뜨리면 **조용히** 비고 증적의 입력 칸이 전부 `기록 없음`이 된다.
-- 박제 설계 전체가 막으려던 실패가 아무 소리 없이 일어난다
ALTER TABLE run_item ALTER COLUMN param_schema    DROP DEFAULT;
ALTER TABLE run_item ALTER COLUMN expected_schema DROP DEFAULT;
-- timeout_ms 는 NULL 을 허용하되 「마이그레이션 이전 행」과 「INSERT 누락」을 가른다.
-- 이전 행은 file_path 가 '' 다. 그 뒤에 만든 행은 반드시 채운다
ALTER TABLE run_item ADD CONSTRAINT run_item_timeout_recorded
  CHECK (file_path = '' OR timeout_ms IS NOT NULL);

-- 기존 유일성 인덱스를 회차까지 포함하도록 갈아 끼운다.
-- 이름은 Postgres가 붙인 자동 이름이다. 적용 전에 \d run_item으로 확인한다
DROP INDEX run_item_run_id_tc_id_platform_idx;
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform, attempt);

-- ── 4. 증적 문서의 「만드는 중」 ──────────────────────────────────
ALTER TABLE evidence_document
  ADD COLUMN status      TEXT NOT NULL DEFAULT 'READY',   -- 이미 있는 행은 파일이 있으니 READY 가 맞다
  ADD COLUMN error       TEXT,
  ADD COLUMN finished_at TIMESTAMPTZ;
ALTER TABLE evidence_document ALTER COLUMN status    DROP DEFAULT;
ALTER TABLE evidence_document ALTER COLUMN file_path DROP NOT NULL;
CREATE UNIQUE INDEX ON evidence_document (run_id, format) WHERE status = 'PENDING';

-- ── 5. 대시보드 계정의 기본 허용을 끈다 (2026-09-17 결정) ────────
-- 이 마이그레이션의 앞 판에는 「기존 GRANT SELECT ON ALL TABLES 는 그때 있던 표에만 붙었으므로
-- app_user 는 자동으로 포함되지 않는다」고 적혀 있었다. **사실이 아니었다.**
-- db/init/01-grafana-readonly.sql 이 platform 계정으로 돌면서
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_ro;
-- 를 걸었고, 마이그레이션도 같은 platform 계정으로 돈다.
-- 즉 **이 계정이 앞으로 만드는 모든 표에 SELECT 가 자동으로 붙는다.** 비밀번호 해시 표도 포함이었다.
-- REVOKE 한 줄이 그 표 하나는 막아 주지만, 틀린 설명을 남기면 다음 표는 아무도 안 막는다
ALTER DEFAULT PRIVILEGES FOR ROLE platform IN SCHEMA public
  REVOKE SELECT ON TABLES FROM grafana_ro;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM grafana_ro;
-- 대시보드가 실제로 읽는 표에만 명시적으로 준다 (§8.5 — run_item 직접 조회 + 최근 실행 목록).
-- 새 패널이 다른 표를 읽어야 하면 **그때** 한 줄을 더한다. 자동으로 따라붙지 않는 것이 이 결정의 전부다
GRANT SELECT ON test_run, run_item TO grafana_ro;

-- 이미 쌓인 행의 새 칸은 ''·'{}'·NULL로 남는다. 화면과 증적은 '기록 없음'으로 쓴다.
-- 옛 값을 지금 값으로 덮지 않는다

-- migrate:down

DROP INDEX IF EXISTS evidence_document_run_id_format_idx;
ALTER TABLE evidence_document ALTER COLUMN file_path SET NOT NULL;
ALTER TABLE evidence_document
  DROP COLUMN IF EXISTS finished_at,
  DROP COLUMN IF EXISTS error,
  DROP COLUMN IF EXISTS status;

DROP INDEX IF EXISTS run_item_run_id_tc_id_platform_attempt_idx;
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform);
ALTER TABLE run_item DROP CONSTRAINT IF EXISTS run_item_timeout_recorded;
ALTER TABLE run_item
  DROP COLUMN IF EXISTS timeout_ms,
  DROP COLUMN IF EXISTS param_set_id,
  DROP COLUMN IF EXISTS expected_schema,
  DROP COLUMN IF EXISTS param_schema,
  DROP COLUMN IF EXISTS file_path,
  DROP COLUMN IF EXISTS attempt;

ALTER TABLE test_run DROP CONSTRAINT IF EXISTS test_run_service_pair;
ALTER TABLE test_run
  DROP COLUMN IF EXISTS notified_at,
  DROP COLUMN IF EXISTS notify_slack,
  DROP COLUMN IF EXISTS triggered_by_name,
  DROP COLUMN IF EXISTS base_url,
  DROP COLUMN IF EXISTS tests_repo,
  DROP COLUMN IF EXISTS service_name,
  DROP COLUMN IF EXISTS service_id;
ALTER TABLE test_run ALTER COLUMN env SET DEFAULT 'demo';

DROP TABLE IF EXISTS user_service;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS service_env;
DROP TABLE IF EXISTS service;

-- 대시보드 계정의 기본 허용을 되돌린다
ALTER DEFAULT PRIVILEGES FOR ROLE platform IN SCHEMA public
  GRANT SELECT ON TABLES TO grafana_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_ro;
