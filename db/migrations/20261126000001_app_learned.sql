-- 앱 배운 것 — Android 앱 작성 AI 가 앱을 써 보며 배운 「이걸 하면 어떻게 되나」를 애플리케이션마다 쌓는다 (docs/spec/공통/4-데이터모델.md 「앱 배운 것 표」 · 도메인/작성 §3.6 「★ 앱 배우기」 · APP-F5-02)

-- migrate:up

-- 「어떻게 가나」는 app_route 가 맡는다 — 길 줄과 배운 줄은 성격이 달라 섞으면 둘 다 읽기 어렵다(작성 §3.6 「★ 앱 배우기」 결정 3).
-- 종류에 CHECK 를 둔다 — 게임(game_element.kind)은 에이전트가 종류를 더해 CHECK 를 걷었지만 앱은 AI 가 종류를 만들지 않는다
CREATE TABLE app_learned (
  id          BIGSERIAL   PRIMARY KEY,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL CHECK (key <> ''),
  kind        TEXT        NOT NULL CHECK (kind IN ('SCREEN', 'RULE', 'INPUT', 'STATE', 'FLOW', 'ROLE', 'SIGNAL', 'ASK', 'ODD', 'NOTE')),
  name        TEXT        NOT NULL CHECK (name <> ''),
  -- 그 줄이 말하는 앱 화면 열쇠(app:…). 배운 줄 없는 화면을 이 칸으로 센다. 화면에 매이지 않는 줄(쪽지 · 앱 전체 물음)은 비운다
  screen_key  TEXT,
  learned     JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, key)
);

-- migrate:down

DROP TABLE app_learned;
