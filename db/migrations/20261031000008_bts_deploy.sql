-- 프로젝트 배포 신호 한 번과 그 배포로 맡은 BTS 이슈 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F5-01)

-- migrate:up

-- 배포 신호 한 번이 한 줄. run_ids 는 이 배포가 애플리케이션마다 건 첫 실행(스모크, 없으면 회귀)이다 —
-- 앱 · 게임은 배포 빌드 번호가 아닌 그 줄의 최신 APK 로 돌아 빌드 번호로는 이 배포의 스모크를 못 찾는다(BTS-F5-01 시작 질문)
-- grafana_ro 에 아무것도 주지 않는다 — 어느 패널도 안 읽는다
CREATE TABLE bts_deploy (
  id                 BIGSERIAL   PRIMARY KEY,
  project_id         BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  build_no           TEXT        NOT NULL,
  rollback           BOOLEAN     NOT NULL DEFAULT false,
  rollback_keys      TEXT[]      NOT NULL DEFAULT '{}',
  service_ids        BIGINT[]    NOT NULL,
  run_ids            BIGINT[]    NOT NULL DEFAULT '{}',
  state              TEXT        NOT NULL DEFAULT 'SMOKE' CHECK (state IN ('SMOKE', 'CLAIMED', 'HELD', 'FAILED')),
  revert_request_id  BIGINT      REFERENCES authoring_request(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, build_no)
);
CREATE INDEX ON bts_deploy USING gin (run_ids);

-- 맡은 이슈. 이슈가 「QA 요청」을 떠나면 released_at 을 채워 놓는다 — 다시 오면 다음 배포가 새 줄로 맡는다
CREATE TABLE bts_claim (
  id          BIGSERIAL   PRIMARY KEY,
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  issue_key   TEXT        NOT NULL,
  deploy_id   BIGINT      NOT NULL REFERENCES bts_deploy(id) ON DELETE CASCADE,
  issue_type  TEXT        NOT NULL CHECK (issue_type IN ('TASK', 'BUG')),
  late        BOOLEAN     NOT NULL DEFAULT false,
  request_id  BIGINT      REFERENCES authoring_request(id) ON DELETE SET NULL,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX ON bts_claim (project_id, issue_key) WHERE released_at IS NULL;

-- migrate:down

DROP TABLE IF EXISTS bts_claim;
DROP TABLE IF EXISTS bts_deploy;
