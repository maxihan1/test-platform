-- 정식 실행 trace.zip 을 푼 네트워크 · 조작 · 콘솔과 푼 상태 (진행판 PRD-F10-03)
-- 칸은 「trace 기록 표」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 항목마다 한 줄. 줄이 없으면 아직 안 풀었거나 이 기능 전의 항목이다
CREATE TABLE run_trace (
  history_id BIGINT      PRIMARY KEY REFERENCES run_item(history_id) ON DELETE CASCADE,
  status     TEXT        NOT NULL CHECK (status IN ('DONE', 'NONE', 'FAILED')),
  reason     TEXT,                                -- NONE · FAILED 의 사유 한 줄
  loaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 값은 모두 가린 뒤 넣는다. 헤더는 안 남긴다. 본문은 실패 항목의 API 줄만 2000자까지
CREATE TABLE run_network (
  id            BIGSERIAL PRIMARY KEY,
  history_id    BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  ord           INTEGER NOT NULL,                 -- 그 항목 안의 차례
  seq           INTEGER,                          -- 단계 번호. 단계 밖(정리)이면 NULL
  at_ms         INTEGER NOT NULL,                 -- 테스트 시작부터
  method        TEXT    NOT NULL,
  url           TEXT    NOT NULL,
  status        INTEGER,                          -- 응답이 없으면 NULL
  resource_type TEXT    NOT NULL,                 -- document · fetch · xhr · api(요청 도구) · 그 밖은 실패한 것만
  duration_ms   INTEGER,
  failure       TEXT,
  request_body  TEXT,
  response_body TEXT,
  UNIQUE (history_id, ord)
);

CREATE TABLE run_action (
  id          BIGSERIAL PRIMARY KEY,
  history_id  BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  ord         INTEGER NOT NULL,
  seq         INTEGER,
  at_ms       INTEGER NOT NULL,
  title       TEXT    NOT NULL,                   -- Playwright 가 붙인 이름(「Click getByRole(…)」)
  target      TEXT,                               -- locator · 주소
  value       TEXT,                               -- 넣은 값. 비밀번호 칸이면 가린다
  duration_ms INTEGER,
  error       TEXT,
  UNIQUE (history_id, ord)
);

CREATE TABLE run_console (
  id         BIGSERIAL PRIMARY KEY,
  history_id BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  ord        INTEGER NOT NULL,
  seq        INTEGER,
  at_ms      INTEGER NOT NULL,
  level      TEXT    NOT NULL,                    -- error · warning · pageerror
  text       TEXT    NOT NULL,
  url        TEXT,
  UNIQUE (history_id, ord)
);

-- migrate:down

DROP TABLE IF EXISTS run_console;
DROP TABLE IF EXISTS run_action;
DROP TABLE IF EXISTS run_network;
DROP TABLE IF EXISTS run_trace;
