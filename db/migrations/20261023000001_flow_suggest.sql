-- AI 일 종류에 E2E 흐름 후보 SUGGEST_FLOWS 를 더한다 (docs/spec/공통/4-데이터모델.md 「성능 테스트 표」 · 도메인/시나리오 §3.7 결정 15 · E2E-F2-03)

-- migrate:up

ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN', 'SUGGEST_FLOWS'));

-- migrate:down

DELETE FROM perf_ai_job WHERE kind = 'SUGGEST_FLOWS';
ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN'));
