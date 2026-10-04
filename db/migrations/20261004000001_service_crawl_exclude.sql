-- 서비스 설정 「훑지 않을 경로」 — 화면만 작성이 크롤에서 뺄 경로 목록 (2026-10-04 사용자 · PR #153)
-- 정본은 docs/spec/공통/4-데이터모델.md service 표 · 값 규칙은 도메인/인증 §7 계약 변경 블록(apps/admin/src/settings/rules.ts)
-- 빈 목록이 기본이다 — 지금까지처럼 모든 화면을 훑는다

-- migrate:up

ALTER TABLE service ADD COLUMN crawl_exclude TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE service DROP COLUMN crawl_exclude;
