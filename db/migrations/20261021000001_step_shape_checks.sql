-- 절차마다 API 응답 모양 확인 줄을 남긴다 — 확인 문장과 따로 (docs/spec/공통/4-데이터모델.md 「API 테스트 표」 · API-F1-05)

-- migrate:up

-- [{ method, path, status, result, problems? }] (공통/3 ShapeCheck). API 케이스가 아니거나 문서 경로 밖 요청뿐이면 NULL
ALTER TABLE run_item_step     ADD COLUMN shape_checks JSONB;
ALTER TABLE scenario_run_step ADD COLUMN shape_checks JSONB;

-- migrate:down

ALTER TABLE scenario_run_step DROP COLUMN IF EXISTS shape_checks;
ALTER TABLE run_item_step     DROP COLUMN IF EXISTS shape_checks;
