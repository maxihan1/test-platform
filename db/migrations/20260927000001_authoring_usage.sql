-- 작성 요청이 쓴 토큰을 남기는 칸과 대시보드 칸 권한 (docs/spec/도메인/작성.md §7 「토큰 사용량」 · 공통/4-데이터모델 「대시보드 칸 권한」)

-- migrate:up

-- 비어 있으면 알리지 않은 요청이다(옛 요청 · claude 를 돌리기 전에 실패). 0 으로 채우면 「안 썼다」로 읽힌다
ALTER TABLE authoring_request ADD COLUMN tokens_input BIGINT;
ALTER TABLE authoring_request ADD COLUMN tokens_output BIGINT;
ALTER TABLE authoring_request ADD COLUMN tokens_cache_read BIGINT;
ALTER TABLE authoring_request ADD COLUMN tokens_cache_write BIGINT;
-- 끊겨서 턴 이벤트로 센 하한값인가. 대시보드가 시간초과를 가르는 칸이다 — 오류 글(error)은 대시보드에 안 연다
ALTER TABLE authoring_request ADD COLUMN tokens_partial BOOLEAN;
-- API 요금으로 친 참고값. 구독이라 청구액이 아니다
ALTER TABLE authoring_request ADD COLUMN cost_usd NUMERIC(12, 6);
ALTER TABLE authoring_request ADD COLUMN tokens_model TEXT;

GRANT SELECT (tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, tokens_partial, cost_usd, tokens_model)
  ON authoring_request TO grafana_ro;

-- migrate:down

REVOKE SELECT (tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, tokens_partial, cost_usd, tokens_model)
  ON authoring_request FROM grafana_ro;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_model;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS cost_usd;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_partial;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_cache_write;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_cache_read;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_output;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS tokens_input;
