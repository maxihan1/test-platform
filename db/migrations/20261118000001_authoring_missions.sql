-- 게임 작성이 올린 게임 시나리오 미션 목록 — 사람이 테스트 작성 「결정 필요」에서 골라 게임 시나리오 테스트로 쓴다 (docs/spec/공통/4-데이터모델.md 「작성 대기줄」 missions · 도메인/게임 §3.10 결정 24 · GAME-F3-04)

-- migrate:up

-- 모양 검사는 서버가 한다(authoring/missions.ts). 쓴 미션은 그 미션을 실은 작성 요청의 params.missions 로 센다 — 여기 따로 적지 않는다
ALTER TABLE authoring_request ADD COLUMN missions JSONB;

-- migrate:down

ALTER TABLE authoring_request DROP COLUMN IF EXISTS missions;
