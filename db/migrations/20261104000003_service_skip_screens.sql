-- 결정 목록 「테스트가 확인하지 않은 화면」에서 [제외]한 화면 틀 — 셈에서 빼고 AI 가 화면만 작성 때 확인한 화면으로 보고 건너뛴다 (docs/spec/도메인/작성.md §3.6 「★ 결정 목록」 「제외한 화면」)
-- 탐색 제외 경로(crawl_exclude)와 다르다 — 그쪽은 경로 아래를 통째로 안 훑고, 이쪽은 그 화면 하나만 테스트에서 뺀다

-- migrate:up

ALTER TABLE service ADD COLUMN skip_screens TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE service DROP COLUMN skip_screens;
