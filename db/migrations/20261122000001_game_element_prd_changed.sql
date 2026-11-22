-- 게임 지도가 기획서 새 판을 따라가게 — 근거 요구가 바뀐 요소를 표시하는 칸 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 채우는 때 · 공통/4-데이터모델 「게임 테스트 표」)
-- 기획서 새 판 저장(prd/store.ts 판넣기)이 채우고, 작성이 그 요소를 다시 올리면(prd/gameMap.ts 요소넣기) 비운다
-- updated_at 으로 따지지 않는 까닭 — 실행이 서버 값을 적을 때도 updated_at 이 바뀌어 표시가 사라진다

-- migrate:up

ALTER TABLE game_element ADD COLUMN prd_changed TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE game_element DROP COLUMN prd_changed;
