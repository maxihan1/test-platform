-- 게임 정식 실행 항목이 도는 동안 러너가 1초마다 읽은 FPS 를 항목마다 남긴다 (공통/4-데이터모델 「게임 항목 FPS 칸」 · WEB-F7-25)
-- 칸은 run_item 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- [{ seq, fps }] — 실행 결과 fps 그대로 상한(execution/runLifecycle.ts FPS상한)까지. 못 읽은 초는 fps 가 null 이다. 안 잰 항목은 NULL 이다
ALTER TABLE run_item ADD COLUMN fps JSONB CHECK (fps IS NULL OR jsonb_typeof(fps) = 'array');

-- migrate:down

ALTER TABLE run_item DROP COLUMN IF EXISTS fps;
