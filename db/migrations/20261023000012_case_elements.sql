-- 케이스 선언의 게임 요소 열쇠를 담는 칸 — 스캐너가 코드에서 채우고 게임 지도의 요소를 거친 케이스(game_element_case)를 다시 채운다 (docs/spec/공통/4-데이터모델.md 「게임 표」 대기 블록의 elements · GAME-F1-12)

-- migrate:up

ALTER TABLE test_case ADD COLUMN elements TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE test_case DROP COLUMN elements;
