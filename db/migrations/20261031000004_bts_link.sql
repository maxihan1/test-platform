-- 프로젝트마다 BTS 연결 하나와 애플리케이션 코드 저장소 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F3-01)

-- migrate:up

-- 열쇠 둘(bot_key · webhook_secret)은 원문이다 — BTS 를 부를 때 · 서명을 확인할 때 써야 한다. 설정 응답은 끝 4자리만 준다.
-- 배포 열쇠 · 규칙 토큰은 해시만 두고, 화면이 「••••a1b2 · 만든 때」를 보이게 끝 4자리와 만든 때를 같이 둔다(BTS-F3-01 시작 질문)
-- grafana_ro 에 아무것도 주지 않는다 — 어느 패널도 안 읽고 비밀값이 있다
CREATE TABLE bts_link (
  project_id      BIGINT      PRIMARY KEY REFERENCES project(id) ON DELETE CASCADE,
  base_url        TEXT        NOT NULL,
  bts_project     TEXT        NOT NULL,
  bot_key         TEXT        NOT NULL,
  webhook_secret  TEXT        NOT NULL,
  deploy_key_hash TEXT        UNIQUE,
  deploy_key_tail TEXT,
  deploy_key_by   TEXT,
  deploy_key_at   TIMESTAMPTZ,
  rule_token_hash TEXT        UNIQUE,
  rule_token_tail TEXT,
  rule_token_by   TEXT,
  rule_token_at   TIMESTAMPTZ,
  status_map      JSONB       NOT NULL,
  resolution_map  JSONB       NOT NULL,
  updated_by      TEXT        NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 열쇠 하나의 네 칸은 같이 비거나 같이 찬다
  CHECK (num_nulls(deploy_key_hash, deploy_key_tail, deploy_key_by, deploy_key_at) IN (0, 4)),
  CHECK (num_nulls(rule_token_hash, rule_token_tail, rule_token_by, rule_token_at) IN (0, 4))
);

ALTER TABLE service ADD COLUMN code_repos JSONB NOT NULL DEFAULT '[]';

-- migrate:down

ALTER TABLE service DROP COLUMN IF EXISTS code_repos;
DROP TABLE IF EXISTS bts_link;
