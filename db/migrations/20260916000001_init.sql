-- SPEC §6 데이터 모델 전체. 카탈로그 캐시부터 증적 문서까지 한 번에 만든다

-- migrate:up

-- 카탈로그 (스캔 결과 캐시. 진실의 원천은 코드)
CREATE TABLE test_case (
  tc_id           TEXT PRIMARY KEY,
  name            TEXT        NOT NULL,
  platforms       JSONB       NOT NULL DEFAULT '["desktop"]',
  precondition    JSONB       NOT NULL DEFAULT '[]',
  file_path       TEXT        NOT NULL,
  param_schema    JSONB       NOT NULL,
  expected_schema JSONB       NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 저장된 입력값 묶음 (파라미터별 행 분리 금지. JSONB 통째로)
CREATE TABLE param_set (
  id          BIGSERIAL PRIMARY KEY,
  tc_id       TEXT        NOT NULL REFERENCES test_case(tc_id),
  name        TEXT        NOT NULL,
  params      JSONB       NOT NULL,
  expected    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tc_id, name)
);

-- 실행 묶음
CREATE TABLE test_run (
  run_id       BIGSERIAL PRIMARY KEY,
  title        TEXT        NOT NULL,
  triggered_by TEXT        NOT NULL,
  env          TEXT        NOT NULL DEFAULT 'demo',
  status       TEXT        NOT NULL,   -- RUNNING | FINISHED | ABORTED
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ
);

-- 실행 항목 (params/expected는 실행 시점 스냅샷)
CREATE TABLE run_item (
  history_id  BIGSERIAL PRIMARY KEY,
  run_id      BIGINT      NOT NULL REFERENCES test_run(run_id),
  tc_id       TEXT        NOT NULL,
  platform    TEXT        NOT NULL DEFAULT 'desktop',  -- desktop | mobile
  tc_name     TEXT        NOT NULL,   -- 스냅샷. 이름이 나중에 바뀌어도 증적은 그대로
  precondition JSONB      NOT NULL DEFAULT '[]',
  params      JSONB       NOT NULL,
  expected    JSONB       NOT NULL,
  status      TEXT        NOT NULL,   -- PASS | FAIL | NA. 생성 시 NA, finished_at이 NULL이면 아직 실행 전
  duration_ms INTEGER,
  error       JSONB,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX ON run_item (run_id);
CREATE INDEX ON run_item (tc_id, platform, started_at DESC);  -- 케이스×환경 이력 추적
-- 같은 run 안에서 같은 케이스가 환경별로 각각 1행씩 쌓인다
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform);

-- 절차 + 검증 문장
CREATE TABLE run_item_step (
  id              BIGSERIAL PRIMARY KEY,
  history_id      BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  status          TEXT    NOT NULL,
  duration_ms     INTEGER,
  assertions      JSONB   NOT NULL DEFAULT '[]',  -- AssertionResult[]
  line            INTEGER,                        -- 실패한 소스 줄 번호
  screenshot_path TEXT,
  http_trace      JSONB,                          -- API 테스트의 요청·응답 원문
  error           JSONB,
  UNIQUE (history_id, seq)
);

-- 생성된 증적 문서
CREATE TABLE evidence_document (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT      NOT NULL REFERENCES test_run(run_id),
  format       TEXT        NOT NULL,   -- HTML | PDF
  file_path    TEXT        NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grafana 계정은 postgres init 스크립트에서 만들어지고, 여기서 만든 테이블에 SELECT만 얻는다
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_ro;

-- migrate:down

DROP TABLE IF EXISTS evidence_document;
DROP TABLE IF EXISTS run_item_step;
DROP TABLE IF EXISTS run_item;
DROP TABLE IF EXISTS test_run;
DROP TABLE IF EXISTS param_set;
DROP TABLE IF EXISTS test_case;
