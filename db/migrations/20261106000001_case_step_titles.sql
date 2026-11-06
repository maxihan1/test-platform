-- 케이스의 단계 제목 칸 — 시험 · 정식 실행 화면이 처음부터 전체 단계를 그리고 남은 단계를 흐리게 보인다 (2026-11-06 사용자 · WEB-F9-15)
-- 스캐너가 케이스 코드의 test.step 제목을 도는 차례대로 채운다. 다 셀 수 없는 케이스는 NULL 이다 — 단계가 없는 케이스('{}')와 가른다
-- 실행에는 박제하지 않는다 — 끝난 실행의 단계는 run_item_step 이 정본이다 (공통/4-데이터모델 「단계 제목 칸」)

-- migrate:up

ALTER TABLE test_case ADD COLUMN step_titles TEXT[];

-- migrate:down

ALTER TABLE test_case DROP COLUMN step_titles;
