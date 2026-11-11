-- 테스트 수정 바퀴 기록 · 이슈 필드 「테스트 수정 PR」 자리 · 보낼 줄 FIELD (공통/4-데이터모델 「BTS 연동 표」 BTS-F10-03 · 도메인/BTS §3.12 「테스트 수정 바퀴」)
-- bts_link.status_map 에 TEST_FIX 키가 는다 — 비어도 된다(없으면 바퀴가 안 돈다). jsonb 라 칸은 그대로다
-- grafana_ro 에 아무것도 주지 않는다 — 화면 응답이 읽고 어느 패널도 안 읽는다

-- migrate:up

-- 이슈 필드 「테스트 수정 PR」의 BTS 필드 키 — 이슈 값은 키로 적는다. 자동 설정이 만들거나 찾아 적는다. NULL 이면 필드 쓰기를 건너뛴다
ALTER TABLE bts_link ADD COLUMN test_fix_field TEXT;

-- 이슈 하나 · 테스트 하나의 「테스트 수정」 한 번. 사람이 다시 「테스트 수정」으로 옮기면 새 줄이다
CREATE TABLE bts_test_fix (
  id           BIGSERIAL   PRIMARY KEY,
  project_id   BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  issue_key    TEXT        NOT NULL,
  service_id   BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  tc_id        TEXT        NOT NULL,   -- 외래 키를 걸지 않는다 — bts_issue_case 와 같은 까닭
  env          TEXT        NOT NULL,
  failed_run   BIGINT      REFERENCES test_run(run_id) ON DELETE SET NULL,   -- 짝 줄 first_run 그대로 — 실패 카드가 서는 실행
  moved_by     TEXT,                   -- 「테스트 수정」으로 옮긴 BTS 사람 이름 — 되돌릴 담당자
  moved_by_id  TEXT,
  request_id   BIGINT      REFERENCES authoring_request(id) ON DELETE SET NULL,   -- 고침 작성(뿌리)
  pr_url       TEXT,
  merge        TEXT        CHECK (merge IN ('AUTO', 'PERSON')),   -- NULL 이면 아직
  held         TEXT[]      NOT NULL DEFAULT '{}' CHECK (held <@ ARRAY['EXPECTED_CHANGED', 'VERIFY_FEWER', 'MUTATION_MISSED', 'NOT_MEASURED']::TEXT[]),
  summary      TEXT,
  rerun_id     BIGINT      REFERENCES test_run(run_id) ON DELETE SET NULL,
  state        TEXT        NOT NULL DEFAULT 'FIXING' CHECK (state IN ('FIXING', 'WAIT_MERGE', 'RERUNNING', 'PASSED', 'FAILED', 'GAVE_UP')),
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 한 테스트 · 한 대상 서버에 도는 줄은 하나 — 같은 알림이 다시 오거나 재기동 뒤 다시 와도 겹치지 않는다
CREATE UNIQUE INDEX ON bts_test_fix (service_id, tc_id, env) WHERE state IN ('FIXING', 'WAIT_MERGE', 'RERUNNING');
CREATE INDEX ON bts_test_fix (service_id, tc_id);
CREATE INDEX ON bts_test_fix (failed_run);
CREATE INDEX ON bts_test_fix (rerun_id);

-- 처음 표의 칸 CHECK 가 이 이름이다(20261031000005) — 지우지 않고 더하면 이름이 겹쳐 깨진다
ALTER TABLE bts_outbox DROP CONSTRAINT bts_outbox_kind_check;
ALTER TABLE bts_outbox ADD CONSTRAINT bts_outbox_kind_check CHECK (kind IN ('CREATE', 'COMMENT', 'TRANSITION', 'ASSIGN', 'FIELD'));

-- migrate:down

DELETE FROM bts_outbox WHERE kind = 'FIELD';
ALTER TABLE bts_outbox DROP CONSTRAINT bts_outbox_kind_check;
ALTER TABLE bts_outbox ADD CONSTRAINT bts_outbox_kind_check CHECK (kind IN ('CREATE', 'COMMENT', 'TRANSITION', 'ASSIGN'));
DROP TABLE IF EXISTS bts_test_fix;
ALTER TABLE bts_link DROP COLUMN IF EXISTS test_fix_field;
