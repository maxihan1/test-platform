-- 화면 크기 판정 — 찾은 화면마다 PC · 모바일 차이와 대상 서버 줄마다 서비스 판정 (진행판 PRD-F10-07)
-- 칸은 「화면 크기 판정 칸」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 화면 하나의 PC · 모바일 차이(scripts/authoring-crawl-viewport.ts `화면차이`). NULL 이면 모바일로 못 열었거나 누른 뒤에 열린 화면이다
ALTER TABLE screen_found ADD COLUMN viewport JSONB CHECK (viewport IS NULL OR jsonb_typeof(viewport) = 'object');

-- 서비스 판정 — 화면 기록 done 때 서버가 찾은 화면의 차이로 다시 가른다. 설정 저장은 대상 서버 줄을 지우고 다시 넣어도 이 둘을 이어받는다
ALTER TABLE service_env ADD COLUMN viewport_kind TEXT CHECK (viewport_kind IN ('responsive', 'adaptive', 'desktop-only'));
ALTER TABLE service_env ADD COLUMN viewport_judged_at TIMESTAMPTZ;

-- migrate:down

ALTER TABLE service_env DROP COLUMN IF EXISTS viewport_judged_at;
ALTER TABLE service_env DROP COLUMN IF EXISTS viewport_kind;
ALTER TABLE screen_found DROP COLUMN IF EXISTS viewport;
