-- 게임 미션 승인을 걷어 내며 작성 요청의 미션 목록 칸을 지운다 — 미션 목록은 케이스 목록 파일 「게임 시나리오 미션」 절에 남는다 (docs/spec/공통/4-데이터모델.md 「작성 대기줄」 · 도메인/게임 §3.10 결정 33 · GAME-F5-07)

-- migrate:up

ALTER TABLE authoring_request DROP COLUMN IF EXISTS missions;

-- migrate:down

-- 칸만 되살린다. 지운 목록은 돌아오지 않는다
ALTER TABLE authoring_request ADD COLUMN missions JSONB;
