-- 안정화 지표 집계 표 다섯 · AI 일 종류 STAB_SUMMARY · 보내기 줄 종류 STAB_CREATE (docs/spec/공통/4-데이터모델.md 「안정화 표」 · 도메인/안정화 §3.15 · STAB-F1-02)
-- 원래 줄(run_console · run_network · 팜 logcat)이 지워져도 날짜별 추이가 남게 test_run · run_item 에 외래 키를 걸지 않는다(결정 10)
-- grafana_ro 에는 안 준다 — 어느 패널도 안 읽는다

-- migrate:up

-- 정기 실행 하나의 집계. 실행이 끝나고 trace 풀기 · 팜 증적 받기를 기다린 뒤 한 줄
CREATE TABLE stab_run (
  run_id           BIGINT      PRIMARY KEY,
  service_id       BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  env              TEXT        NOT NULL,
  day              DATE        NOT NULL,   -- 집계 때 service.schedule_tz(비었으면 UTC)로 굳힌 실행 시작 날짜
  build_no         TEXT,
  cases            INTEGER     NOT NULL,
  error_cases      INTEGER     NOT NULL,
  pass_error_cases INTEGER     NOT NULL,
  crashes          INTEGER,                -- 웹 애플리케이션은 NULL
  residual         INTEGER     NOT NULL,
  new_errors       INTEGER     NOT NULL,
  resolved         INTEGER     NOT NULL,   -- 집계 때 해결 상태(확인 전)인 종류 수 — 누계가 아니다
  confirmed        INTEGER     NOT NULL,   -- 이 실행이 해결 확인한 종류 수
  ai_job_id        BIGINT      REFERENCES perf_ai_job(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON stab_run (service_id, env, day DESC);

-- 오류 종류. 이전 실행 · 추이가 대상 서버끼리라 해결 처리 · 최초 발생이 다른 서버로 새지 않게 서버마다 따로 묶는다
CREATE TABLE stab_error (
  id               BIGSERIAL   PRIMARY KEY,
  service_id       BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  env              TEXT        NOT NULL,
  source           TEXT        NOT NULL CHECK (source IN ('WEB_PAGEERROR','WEB_CONSOLE','WEB_NETWORK','APP_CRASH','APP_ANR','GAME_EXCEPTION')),
  fingerprint      TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  message          TEXT,
  first_run_id     BIGINT      NOT NULL,
  first_day        DATE        NOT NULL,
  first_build_no   TEXT,
  resolved_at      TIMESTAMPTZ,            -- 재발하면 NULL 로 걷는다
  resolved_by      TEXT,
  confirmed_run_id BIGINT,                 -- 재발하면 NULL
  issue_key        TEXT,
  UNIQUE (service_id, env, fingerprint)
);

CREATE TABLE stab_run_error (
  run_id           BIGINT      NOT NULL REFERENCES stab_run(run_id) ON DELETE CASCADE,
  error_id         BIGINT      NOT NULL REFERENCES stab_error(id) ON DELETE CASCADE,
  state            TEXT        NOT NULL CHECK (state IN ('NEW','UP','REOPENED','ONGOING')),
  cases            INTEGER     NOT NULL,
  hits             INTEGER     NOT NULL,
  prev_resolved_at TIMESTAMPTZ,            -- 재발이면 앞서 해결 처리한 때 — AI 요약 「해결 처리 후 5일 만」
  PRIMARY KEY (run_id, error_id)
);
CREATE INDEX ON stab_run_error (error_id, run_id DESC);

CREATE TABLE stab_occurrence (
  run_id           BIGINT      NOT NULL,
  error_id         BIGINT      NOT NULL,
  history_id       BIGINT      NOT NULL,
  tc_id            TEXT        NOT NULL,
  item_status      TEXT        NOT NULL,
  seq              INTEGER,                -- 앱 logcat 은 1차에서 늘 NULL
  hits             INTEGER     NOT NULL,
  crash            BOOLEAN     NOT NULL,
  device           TEXT,
  PRIMARY KEY (run_id, error_id, history_id),
  FOREIGN KEY (run_id, error_id) REFERENCES stab_run_error(run_id, error_id) ON DELETE CASCADE
);

-- 가장 최근 셋으로 앞에서부터 갈아 끼운다. 글은 가린 뒤 8,000자까지
CREATE TABLE stab_sample (
  error_id         BIGINT      NOT NULL REFERENCES stab_error(id) ON DELETE CASCADE,
  ord              SMALLINT    NOT NULL CHECK (ord BETWEEN 1 AND 3),
  run_id           BIGINT      NOT NULL,
  history_id       BIGINT      NOT NULL,
  tc_id            TEXT        NOT NULL,
  text             TEXT        NOT NULL,
  page             TEXT,
  device           TEXT,
  at               TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (error_id, ord)
);

ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN', 'SUGGEST_FLOWS', 'STAB_SUMMARY'));

-- CREATE 의 「케이스 · 대상 서버 필수」 CHECK 와 고유 색인은 kind = 'CREATE' 에만 걸려 STAB_CREATE 는 tc_id 를 비울 수 있다
ALTER TABLE bts_outbox DROP CONSTRAINT bts_outbox_kind_check;
ALTER TABLE bts_outbox ADD CONSTRAINT bts_outbox_kind_check CHECK (kind IN ('CREATE', 'COMMENT', 'TRANSITION', 'ASSIGN', 'FIELD', 'STAB_CREATE'));

-- migrate:down

DELETE FROM bts_outbox WHERE kind = 'STAB_CREATE';
ALTER TABLE bts_outbox DROP CONSTRAINT bts_outbox_kind_check;
ALTER TABLE bts_outbox ADD CONSTRAINT bts_outbox_kind_check CHECK (kind IN ('CREATE', 'COMMENT', 'TRANSITION', 'ASSIGN', 'FIELD'));

DROP TABLE IF EXISTS stab_sample;
DROP TABLE IF EXISTS stab_occurrence;
DROP TABLE IF EXISTS stab_run_error;
DROP TABLE IF EXISTS stab_error;
DROP TABLE IF EXISTS stab_run;

DELETE FROM perf_ai_job WHERE kind = 'STAB_SUMMARY';
ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN', 'SUGGEST_FLOWS'));
