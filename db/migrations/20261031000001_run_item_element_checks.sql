-- 게임 항목이 데이터 대조로 읽은 서버 값을 항목마다 남긴다 (공통/4-데이터모델 「게임 요소 대조 칸」 · WEB-F7-24)
-- 칸은 run_item 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- [{ key, serverValue, same }] — 실행 결과 elementChecks 에서 다른 줄을 앞에 둬 상한(execution/runLifecycle.ts 대조상한)까지. 대조하지 않은 항목은 NULL 이다
ALTER TABLE run_item ADD COLUMN element_checks JSONB CHECK (element_checks IS NULL OR jsonb_typeof(element_checks) = 'array');

-- migrate:down

ALTER TABLE run_item DROP COLUMN IF EXISTS element_checks;
