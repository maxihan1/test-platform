-- 기능 테스트 케이스의 설계 기법 목록 칸 — 목록 · 엑셀이 기법으로 거르고 보여 준다 (2026-10-05 사용자 · PR #158)
-- 카탈로그는 캐시라 스캐너가 케이스 코드(defineCase 의 techniques)에서 읽어 채운다
-- 빈 목록이 기본이다 — 기법이 안 적힌 케이스(이 PR 전 케이스 · UI 테스트 · 정상 칸)는 「기법 없음」으로 묶인다

-- migrate:up

ALTER TABLE test_case ADD COLUMN techniques TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE test_case DROP COLUMN techniques;
