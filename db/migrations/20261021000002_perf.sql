-- 성능 테스트 표 — 에이전트 · 시나리오 · 실행 · 초 단위 숫자 · 실행 로그 · AI 일 · 더미 클라이언트 (docs/spec/공통/4-데이터모델.md 「성능 테스트 표」 · PERF-F1-03)

-- migrate:up

-- 성능 에이전트 — 부하 발생(LOAD) · 모니터링(MONITOR). 토큰은 해시만 (도메인/성능 §5.4)
CREATE TABLE perf_agent (
  id           BIGSERIAL   PRIMARY KEY,
  name         TEXT        NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 40),
  mode         TEXT        NOT NULL CHECK (mode IN ('LOAD', 'MONITOR')),
  project_id   BIGINT      REFERENCES project(id) ON DELETE CASCADE,   -- 모니터링 에이전트가 매인 프로젝트. 부하 발생 에이전트는 공용이라 NULL
  token_hash   TEXT        NOT NULL UNIQUE,          -- pga_ 토큰의 SHA-256 16진
  host         TEXT,                                 -- 에이전트가 알린 호스트 이름 (보이기만 한다)
  version      TEXT,                                 -- 에이전트 판
  max_vus      INTEGER     CHECK (max_vus IS NULL OR max_vus > 0),   -- LOAD 만. 비면 1,000 으로 센다 — 실측 전 임시 값이다. 기본 에이전트는 hello 의 maxVus 로 500 을 보낸다(공통/6 §9 · 도메인/성능 §5.4 실측). hello 의 maxVus 는 이 칸이 빌 때만 채우고, 사람이 PATCH 로 고친 값이 이긴다(PERF-F1-03 시작 질문)
  busy_run_id  BIGINT,                               -- 지금 맡은 실행 (외래키 없음 — 실행을 지워도 남는다)
  last_seen_at TIMESTAMPTZ,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mode = 'LOAD' OR max_vus IS NULL),
  CHECK ((mode = 'MONITOR') = (project_id IS NOT NULL))
);

-- 성능 시나리오. 정기 실행 네 칸은 service 의 네 칸과 같은 규칙이다 (공통/6 §9.2)
CREATE TABLE perf_scenario (
  id            BIGSERIAL   PRIMARY KEY,
  service_id    BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  version       INTEGER     NOT NULL DEFAULT 1,      -- 마지막 버전
  accounts_csv  TEXT,                                -- 테스트 계정 CSV 원문 — 비밀값. 응답에는 행 수만
  deleted_at    TIMESTAMPTZ,                         -- 지워도 실행 기록이 가리킨다
  schedule_at   TIME,
  schedule_tz   TEXT,
  schedule_env  TEXT,
  schedule_last TIMESTAMPTZ,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((schedule_at IS NULL) = (schedule_tz IS NULL) AND (schedule_at IS NULL) = (schedule_env IS NULL))
);

-- 버전마다 트랜잭션 목록 · 부하 설정 · 성능 목표 · 실행 설정을 통째로 남긴다
CREATE TABLE perf_scenario_version (
  scenario_id BIGINT      NOT NULL REFERENCES perf_scenario(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL CHECK (version >= 1),
  body        JSONB       NOT NULL,                  -- { transactions | dummyClient, load, targets, run } (도메인/성능 §3.9 「스크립트는 생성기가 만든다」)
  source      TEXT        NOT NULL CHECK (source IN ('RECORD', 'SWAGGER', 'FILE', 'MANUAL')),
  recording   TEXT,                                  -- 가린 녹화 원본 파일 이름 (artifacts/perf-record/) — RECORD 만
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scenario_id, version)
);

-- 성능 실행 하나 = 화면 PRF-<id>. 서버 부하(LOAD) · 페이지 단독 측정(PAGE) · 기기 성능(DEVICE)
CREATE TABLE perf_run (
  id                BIGSERIAL   PRIMARY KEY,
  kind              TEXT        NOT NULL CHECK (kind IN ('LOAD', 'PAGE', 'DEVICE')),
  service_id        BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  scenario_id       BIGINT      REFERENCES perf_scenario(id),     -- LOAD 만. 지운 시나리오도 deleted_at 으로 남는다
  scenario_version  INTEGER,
  env               TEXT        NOT NULL,
  base_url          TEXT        NOT NULL,             -- 그때 친 주소 박제
  test_type         TEXT        CHECK (test_type IN ('LOAD', 'STRESS', 'SPIKE', 'SOAK')),
  config            JSONB       NOT NULL,             -- 부하 설정 · 성능 목표 · 에이전트 · 기기 · 측정 항목 박제 (비밀값 뺌)
  status            TEXT        NOT NULL CHECK (status IN ('QUEUED', 'SMOKE', 'RUNNING', 'DONE', 'STOPPED', 'ERROR')),
  verdict           TEXT        CHECK (verdict IN ('PASS', 'FAIL')),
  stop_reason       TEXT        CHECK (stop_reason IN ('TARGET_EXCEEDED', 'ERROR_LIMIT', 'AGENT_LOST', 'SMOKE_FAILED', 'USER')),
  targets           JSONB,                            -- [{ metric, scope, op, value, source, reqId?, measured, verdict }]
  peak_vus          INTEGER,                          -- 스트레스 테스트는 최대 동시 사용자, 그 밖은 최대 가상 사용자
  max_tps           NUMERIC(10,1),
  p95_ms            INTEGER,
  error_rate        NUMERIC(6,3),                     -- %
  degraded          BOOLEAN,                          -- 성능 저하. 견줄 이전 실행이 없으면 NULL
  ai                JSONB,                            -- AI 분석 { title, items, markers? }. 못 만들면 NULL
  origin            TEXT        NOT NULL CHECK (origin IN ('MANUAL', 'SCHEDULED')),
  triggered_by      TEXT,
  triggered_by_name TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ,
  CHECK ((kind = 'LOAD') = (scenario_id IS NOT NULL)),
  CHECK ((kind = 'LOAD') = (test_type IS NOT NULL)),
  CHECK ((scenario_id IS NULL) = (scenario_version IS NULL)),
  -- 끝난 모양마다 상태 · 판정 · 까닭의 짝 (도메인/성능 §3.9 「끝난 모양마다 상태 · 판정 · 까닭」 표)
  CHECK (CASE status
           WHEN 'DONE'    THEN verdict IS NOT NULL AND (stop_reason IS NULL OR (stop_reason = 'TARGET_EXCEEDED' AND verdict = 'FAIL'))
           WHEN 'STOPPED' THEN (stop_reason = 'ERROR_LIMIT' AND verdict = 'FAIL')
                            OR (stop_reason IN ('SMOKE_FAILED', 'AGENT_LOST', 'USER') AND verdict IS NULL)
           ELSE verdict IS NULL AND stop_reason IS NULL
         END)
);

-- 1초 숫자 (서버 부하 · 게임 서버 부하). 트랜잭션마다 한 행과 전체 한 행(tx = '')
CREATE TABLE perf_series (
  run_id   BIGINT    NOT NULL REFERENCES perf_run(id) ON DELETE CASCADE,
  sec      INTEGER   NOT NULL CHECK (sec >= 0),
  tx       TEXT      NOT NULL,
  vus      INTEGER   NOT NULL,
  requests INTEGER   NOT NULL,
  errors   INTEGER   NOT NULL,
  hist     INTEGER[] NOT NULL,                        -- 응답시간 분포 116칸 (도메인/성능 §3.9 「분포」)
  PRIMARY KEY (run_id, sec, tx)
);

-- 서버 모니터링 1초 숫자
CREATE TABLE perf_host_metric (
  run_id       BIGINT       NOT NULL REFERENCES perf_run(id) ON DELETE CASCADE,
  agent_id     BIGINT       NOT NULL,                 -- 모니터링 에이전트 (외래키 없음 — 지워도 남는다)
  agent_name   TEXT         NOT NULL,                 -- 그때 이름 박제
  sec          INTEGER      NOT NULL,
  cpu          NUMERIC(5,1),
  mem          NUMERIC(5,1),
  disk_io_kbps INTEGER,
  net_in_kbps  INTEGER,
  net_out_kbps INTEGER,
  PRIMARY KEY (run_id, agent_id, sec)
);

-- 페이지 측정. 단독 측정은 sec · vus 가 NULL, 부하 중 측정은 그때의 초와 가상 사용자 수
CREATE TABLE perf_page_metric (
  id          BIGSERIAL    PRIMARY KEY,
  run_id      BIGINT       NOT NULL REFERENCES perf_run(id) ON DELETE CASCADE,
  sec         INTEGER,
  vus         INTEGER,
  url         TEXT         NOT NULL,
  device      TEXT         NOT NULL CHECK (device IN ('desktop', 'mobile')),
  network     TEXT         NOT NULL CHECK (network IN ('NONE', 'SLOW_4G')),
  lcp_ms      INTEGER,
  fcp_ms      INTEGER,
  cls         NUMERIC(5,3),
  ttfb_ms     INTEGER,
  lcp_element TEXT,
  resources   JSONB,                                  -- 로딩 워터폴 [{ name, type, startMs, durationMs, bytes }]
  ai          JSONB                                   -- 단독 측정의 페이지별 AI 분석
);

-- 기기 성능 1초 숫자. 같은 모델 두 대를 나란히 재도 겹치지 않게 일련번호로 가른다
CREATE TABLE perf_device_metric (
  run_id      BIGINT       NOT NULL REFERENCES perf_run(id) ON DELETE CASCADE,
  serial      TEXT         NOT NULL,                  -- 기기 일련번호 (adb serial · 팜 udid)
  device      TEXT         NOT NULL,                  -- 기기 이름 박제 (Galaxy A23) — 화면에 보이는 이름
  sec         INTEGER      NOT NULL,
  loop        INTEGER,                                -- 회차 (1부터)
  segment     TEXT,                                   -- 구간 이름 (로비 · 전투)
  fps         NUMERIC(5,1),
  jank_pct    NUMERIC(5,2),                           -- 프레임 드랍률
  cpu         NUMERIC(5,1),
  mem_mb      INTEGER,
  temp_c      NUMERIC(4,1),
  battery_pct NUMERIC(5,1),
  PRIMARY KEY (run_id, serial, sec)
);

-- 실행 로그 (스모크 테스트 통과 · 400명 도달 · 에러 증가 시작 · 자동 중단)
CREATE TABLE perf_event (
  id      BIGSERIAL   PRIMARY KEY,
  run_id  BIGINT      NOT NULL REFERENCES perf_run(id) ON DELETE CASCADE,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  level   TEXT        NOT NULL CHECK (level IN ('INFO', 'WARN')),
  message TEXT        NOT NULL                        -- 화면에 그대로 뜨는 한 줄
);

-- AI 일. 작성 에이전트가 집는다 (도메인/성능 §7 「AI 일」)
CREATE TABLE perf_ai_job (
  id          BIGSERIAL   PRIMARY KEY,
  kind        TEXT        NOT NULL CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN')),
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  run_id      BIGINT      REFERENCES perf_run(id) ON DELETE CASCADE,
  input       JSONB       NOT NULL,
  status      TEXT        NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'DONE', 'FAILED')),
  output      JSONB,
  error       TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- 더미 클라이언트 — admin 이 올린 zip. 파일은 artifacts/perf-dummy/<id>.zip
CREATE TABLE perf_dummy_client (
  id         BIGSERIAL   PRIMARY KEY,
  service_id BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  command    TEXT        NOT NULL,                    -- zip 안에서 띄울 명령 (./bot --users $QAHUB_USERS)
  bytes      BIGINT      NOT NULL,
  created_by TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 실행 로그 · 결과 화면이 실행 하나의 줄을 차례로 읽는다
CREATE INDEX perf_event_run ON perf_event (run_id, id);
CREATE INDEX perf_page_metric_run ON perf_page_metric (run_id);

-- migrate:down

DROP TABLE IF EXISTS perf_dummy_client, perf_ai_job, perf_event, perf_device_metric, perf_page_metric, perf_host_metric, perf_series, perf_run, perf_scenario_version, perf_scenario, perf_agent;
