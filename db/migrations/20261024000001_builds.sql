-- 빌드마다 돌리기 — 스모크 표시 · CI 가 올린 빌드 · CI 토큰 · 빌드로 시작한 실행 (docs/spec/공통/4-데이터모델.md 「게임 테스트 표」 smoke 블록 · 도메인/실행 §3.11 · GAME-F1-13)

-- migrate:up

-- smoke 는 스캐너가 코드에서 채우고, smoke_set 은 사람이 케이스 목록에서 고친 값이다(NULL 이면 코드 값). 스캔이 smoke_set 을 안 덮는다
ALTER TABLE test_case
  ADD COLUMN smoke     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN smoke_set BOOLEAN;

-- 빌드 한 줄. Android 앱 · 게임은 올린 APK(file_path) 또는 회사 저장소 주소(app_url) 둘 중 하나, 웹 · API 는 둘 다 없다(배포 알림)
CREATE TABLE app_build (
  id          BIGSERIAL   PRIMARY KEY,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  env         TEXT        NOT NULL,
  build_no    TEXT        NOT NULL,
  file_path   TEXT,
  app_url     TEXT,
  size_bytes  BIGINT,
  uploaded_by TEXT        NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, env, build_no),
  CHECK (file_path IS NULL OR app_url IS NULL)
);
CREATE INDEX ON app_build (service_id, env, uploaded_at DESC);

-- 원문은 발급 때 한 번만 보이고 해시만 둔다. 쓸 때마다 발급한 계정이 아직 살아 있는 admin 인지 본다
CREATE TABLE service_token (
  id           BIGSERIAL   PRIMARY KEY,
  service_id   BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  token_hash   TEXT        NOT NULL UNIQUE,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- 실행을 만들 때 그 줄의 빌드를 고정한다. build_no 는 빌드 행이 지워져도 남는 스냅샷이다.
-- build_stage 는 빌드로 시작한 실행이 스모크인지 회귀인지 — 스모크가 다 통과해야 회귀를 건다
ALTER TABLE test_run
  ADD COLUMN build_id    BIGINT REFERENCES app_build(id) ON DELETE SET NULL,
  ADD COLUMN build_no    TEXT,
  ADD COLUMN build_stage TEXT CHECK (build_stage IN ('SMOKE', 'FULL'));
ALTER TABLE test_run DROP CONSTRAINT test_run_origin_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_origin_check CHECK (origin IN ('MANUAL','SCHEDULED','RERUN','BUILD'));

-- migrate:down

UPDATE test_run SET origin = 'MANUAL' WHERE origin = 'BUILD';
ALTER TABLE test_run DROP CONSTRAINT test_run_origin_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_origin_check CHECK (origin IN ('MANUAL','SCHEDULED','RERUN'));
ALTER TABLE test_run DROP COLUMN build_stage, DROP COLUMN build_no, DROP COLUMN build_id;
DROP TABLE service_token;
DROP TABLE app_build;
ALTER TABLE test_case DROP COLUMN smoke_set, DROP COLUMN smoke;
