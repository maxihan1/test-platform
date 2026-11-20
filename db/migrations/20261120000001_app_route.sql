-- 앱 조작 맵 — Android 앱 작성이 탐색에서 배운 길 · 데이터 세팅 · API · 용어 · 돌발 팝업을 애플리케이션마다 쌓는다 (docs/spec/공통/4-데이터모델.md 「앱 조작 맵 표」 · 도메인/작성 §3.6 「★ 앱 탐색」 · APP-F4-03)

-- migrate:up

-- 게임 조작 맵 game_route 와 칸 구성은 같지만 따로 둔다(작성 §3.6 「★ 앱 탐색」 결정 6 — 앱과 게임은 줄 종류 · 고치는 길이 다르다).
-- 「어떻게 가나」만 담는다 — 해 보며 본 값은 기대값 근거가 아니라서 적지 않는다
CREATE TABLE app_route (
  id          BIGSERIAL   PRIMARY KEY,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL CHECK (kind IN ('MOVE', 'SETUP', 'API', 'TERM', 'POPUP')),
  -- MOVE 는 출발 화면 키, SETUP 은 도우미가 하는 일, API 는 그 API 를 부른 화면 키, TERM 은 기획서 낱말, POPUP 은 그 창, 진행 불가 목표 줄(BLOCKED)은 목표 화면 키. 비면 경로 검색이 출발점을 못 잡는다
  from_key    TEXT        NOT NULL CHECK (from_key <> ''),
  action      TEXT        NOT NULL CHECK (action <> ''),
  to_key      TEXT,
  helper      TEXT,
  duration_ms INTEGER     CHECK (duration_ms >= 0),
  warning     TEXT,
  fields      JSONB,
  -- RECHECK 은 정식 실행만 단다(APP-F4-09). BLOCKED 는 까닭이 있어야 사람이 PR 머리에서 읽는다
  status      TEXT        NOT NULL CHECK (status IN ('OK', 'RECHECK', 'BLOCKED')),
  reason      TEXT,
  build_no    TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, kind, from_key, action),
  CHECK (status <> 'BLOCKED' OR reason IS NOT NULL)
);

-- migrate:down

DROP TABLE app_route;
