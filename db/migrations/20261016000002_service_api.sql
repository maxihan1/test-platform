-- 서비스 지도 — 대상 서비스가 부르는 같은 사이트 API 와 그 API 를 거친 케이스 · 화면 (진행판 PRD-F10-05)
-- 칸은 「서비스 지도 표」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- API 하나. 주소 틀은 숫자 · uuid · 긴 16진 칸을 자리표로 바꾸고 물음표 뒤를 뺀 경로다 (apps/admin/src/prd/apiMap.ts `API틀`)
CREATE TABLE service_api (
  id         BIGSERIAL   PRIMARY KEY,
  service_id BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  method     TEXT        NOT NULL,
  host       TEXT        NOT NULL,                -- 포트까지(localhost:3001). 대상 서버마다 다르면 다른 줄이다
  path       TEXT        NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, method, host, path)
);

-- 그 API 를 누가 거쳤나. 케이스 줄(정식 실행 trace)이거나 화면 줄(크롤러) 둘 중 하나다
CREATE TABLE service_api_use (
  id         BIGSERIAL   PRIMARY KEY,
  api_id     BIGINT      NOT NULL REFERENCES service_api(id) ON DELETE CASCADE,
  service_id BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  tc_id      TEXT,                                -- 케이스 줄
  run_id     BIGINT,                              -- 그 케이스 줄을 채운 실행. 더 새 실행을 풀면 그 케이스 줄을 갈아 끼운다. 실행을 지워도 지도는 남는다
  steps      INTEGER[]   NOT NULL DEFAULT '{}',   -- 그 API 를 부른 단계 번호. 준비 · 정리 중 호출은 안 든다
  env        TEXT,                                -- 화면 줄 — 화면 기록 열쇠(대상 서버 · 상태 · 같은 틀)
  state      TEXT,
  screen_url TEXT,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (tc_id IS NOT NULL AND run_id IS NOT NULL AND env IS NULL AND state IS NULL AND screen_url IS NULL)
    OR (tc_id IS NULL AND run_id IS NULL AND env IS NOT NULL AND state IS NOT NULL AND screen_url IS NOT NULL)
  ),
  -- 화면 기록이 지워지면(다 봤는데 못 본 화면) 그 화면 줄도 지워진다. 케이스 줄은 칸이 비어 이 열쇠를 안 본다
  FOREIGN KEY (service_id, env, state, screen_url) REFERENCES screen_record (service_id, env, state, url) ON DELETE CASCADE
);
CREATE UNIQUE INDEX service_api_use_case ON service_api_use (api_id, tc_id) WHERE tc_id IS NOT NULL;
CREATE UNIQUE INDEX service_api_use_screen ON service_api_use (api_id, env, state, screen_url) WHERE tc_id IS NULL;
CREATE INDEX service_api_use_tc ON service_api_use (tc_id) WHERE tc_id IS NOT NULL;

-- migrate:down

DROP TABLE IF EXISTS service_api_use;
DROP TABLE IF EXISTS service_api;
