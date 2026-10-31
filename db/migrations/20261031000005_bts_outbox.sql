-- BTS 로 보낼 줄과 케이스 ↔ BTS 이슈 짝 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F3-02 · F3-03)

-- migrate:up

-- 60초 점검이 next_at 이 지난 PENDING 을 보낸다. 1분 간격 5번 · 4xx 는 바로 GAVE_UP(408 · 429 는 다시 보낸다).
-- 표에 남아 있어 admin 이 다시 떠도 이어 보낸다 — 메모리 타이머는 재기동 때 보낼 것을 잃는다(도메인/BTS 결정 17)
-- grafana_ro 에 아무것도 주지 않는다 — 어느 패널도 안 읽는다
CREATE TABLE bts_outbox (
  id          BIGSERIAL   PRIMARY KEY,
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL CHECK (kind IN ('CREATE', 'COMMENT', 'TRANSITION', 'ASSIGN')),
  issue_key   TEXT,
  service_id  BIGINT      REFERENCES service(id) ON DELETE CASCADE,
  run_id      BIGINT      REFERENCES test_run(run_id) ON DELETE SET NULL,
  tc_id       TEXT,
  env         TEXT,
  payload     JSONB       NOT NULL,
  state       TEXT        NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'SENT', 'GAVE_UP')),
  tries       INTEGER     NOT NULL DEFAULT 0,
  next_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON bts_outbox (state, next_at);
-- 한 테스트 · 한 대상 서버에 기다리는 등록은 하나 — 보내기 전에 또 실패하면 새로 안 넣는다(첫 실패 실행으로 올린다)
CREATE UNIQUE INDEX ON bts_outbox (service_id, tc_id, env) WHERE kind = 'CREATE' AND state = 'PENDING';

-- 같은 테스트가 또 실패하면 닫히지 않은 줄의 이슈에 댓글만 단다. tc_id 에 외래 키를 걸지 않는다 — 케이스가 지워져도 짝은 남는다
CREATE TABLE bts_issue_case (
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  issue_key   TEXT        NOT NULL,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  tc_id       TEXT        NOT NULL,
  env         TEXT        NOT NULL,
  first_run   BIGINT      REFERENCES test_run(run_id) ON DELETE SET NULL,
  closed_at   TIMESTAMPTZ,
  -- FIXED 는 재검증 통과로 QA Hub 가 닫은 것(BTS 해결 상태 짝이 없다 — 「닫힘」으로 옮기기만 한다)
  resolution  TEXT        CHECK (resolution IN ('SCREEN_RIGHT', 'TEST_PROBLEM', 'FLAKY', 'ENV', 'DUPLICATE', 'FIXED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, issue_key, tc_id)
);
-- 한 테스트 · 한 대상 서버에 열린 이슈는 하나
CREATE UNIQUE INDEX ON bts_issue_case (service_id, tc_id, env) WHERE closed_at IS NULL;

-- migrate:down

DROP TABLE IF EXISTS bts_issue_case;
DROP TABLE IF EXISTS bts_outbox;
