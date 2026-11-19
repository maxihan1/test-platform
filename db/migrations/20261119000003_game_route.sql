-- 조작 맵 — 게임 작성 AI 가 플레이해 알아낸 조작을 애플리케이션마다 쌓는다 (docs/spec/공통/4-데이터모델.md 「게임 테스트 표」 · 도메인/게임 §3.10 「탐색 플레이 · 조작 맵」 · GAME-F5-02)

-- migrate:up

-- 행 종류 다섯을 표 하나에 칸으로 나눈다(게임 지도 game_element 와 같은 꼴). 「어떻게 가나」만 담는다 — 해 보며 본 값은 기대값 근거가 아니라서 적지 않는다
CREATE TABLE game_route (
  id          BIGSERIAL   PRIMARY KEY,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL CHECK (kind IN ('MOVE', 'SETUP', 'LOG', 'TERM', 'POPUP')),
  -- MOVE · SETUP · LOG 는 출발 열쇠, TERM 은 기획서 낱말, POPUP 은 그 창 주소, 진행 불가 목표 행(BLOCKED)은 목표 열쇠. 비면 경로 검색이 출발점을 못 잡는다
  from_key    TEXT        NOT NULL CHECK (from_key <> ''),
  action      TEXT        NOT NULL CHECK (action <> ''),
  to_key      TEXT,
  helper      TEXT,
  duration_ms INTEGER     CHECK (duration_ms >= 0),
  warning     TEXT,
  fields      JSONB,
  -- RECHECK 는 정식 실행만 단다(GAME-F5-06). BLOCKED 는 까닭이 있어야 사람이 PR 머리에서 읽는다
  status      TEXT        NOT NULL CHECK (status IN ('OK', 'RECHECK', 'BLOCKED')),
  reason      TEXT,
  build_no    TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, kind, from_key, action),
  CHECK (status <> 'BLOCKED' OR reason IS NOT NULL)
);

-- migrate:down

DROP TABLE game_route;
