-- 애플리케이션 종류 GAME · 대상 서버 줄의 어드민 키 · 게임 지도(게임 요소 · 요소를 거친 케이스) (docs/spec/공통/4-데이터모델.md 「게임 테스트 표」 · GAME-F1-07)

-- migrate:up

ALTER TABLE service DROP CONSTRAINT service_kind_check;
ALTER TABLE service ADD CONSTRAINT service_kind_check CHECK (kind IN ('SCREEN', 'APP', 'GAME', 'API'));

-- { header, value }. 게임 서버 어드민 API 가 머리 하나로 열린다(Ashveil X-Admin-Key) — OAuth 꼴 api_auths 에 안 맞는다
ALTER TABLE service_env ADD COLUMN admin_key JSONB;

CREATE TABLE game_element (
  service_id   BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  kind         TEXT        NOT NULL CHECK (kind IN ('DATA', 'WORLD', 'STATE', 'MOVE', 'FLOW')),
  key          TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  value        JSONB,
  req_ids      TEXT[]      NOT NULL DEFAULT '{}',
  server_value JSONB,
  checked_run  BIGINT      REFERENCES test_run(run_id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, key)
);

-- 열쇠에 외래 키를 걸지 않는다 — 걸면 지도에 없는 열쇠 한 줄로 스캔 전체가 실패한다(req_case 와 같은 까닭)
CREATE TABLE game_element_case (
  service_id BIGINT NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  key        TEXT   NOT NULL,
  tc_id      TEXT   NOT NULL,
  PRIMARY KEY (service_id, key, tc_id)
);

-- migrate:down

DROP TABLE game_element_case;
DROP TABLE game_element;
ALTER TABLE service_env DROP COLUMN admin_key;
UPDATE service SET kind = 'APP' WHERE kind = 'GAME';
ALTER TABLE service DROP CONSTRAINT service_kind_check;
ALTER TABLE service ADD CONSTRAINT service_kind_check CHECK (kind IN ('SCREEN', 'APP', 'API'));
