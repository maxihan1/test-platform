-- 게임 지도에 플레이하며 배운 것을 담는 칸을 더하고, 종류 CHECK 를 걷는다 (도메인/게임 §3.10 「게임에 대해 배운 것」 · 공통/4-데이터모델 「게임 테스트 표」)
-- 종류는 코드 상수(apps/admin/src/prd/gameKinds.ts 요소종류)와 그 게임 지도의 `kind:` 줄이 정본이다 — 에이전트가 플레이하며 종류를 더해 마이그레이션으로 쫓아갈 수 없다

-- migrate:up

ALTER TABLE game_element ADD COLUMN learned JSONB;
ALTER TABLE game_element DROP CONSTRAINT game_element_kind_check;

-- migrate:down

DELETE FROM game_element WHERE kind NOT IN ('DATA', 'WORLD', 'STATE', 'MOVE', 'FLOW');
ALTER TABLE game_element ADD CONSTRAINT game_element_kind_check CHECK (kind IN ('DATA', 'WORLD', 'STATE', 'MOVE', 'FLOW'));
ALTER TABLE game_element DROP COLUMN learned;
