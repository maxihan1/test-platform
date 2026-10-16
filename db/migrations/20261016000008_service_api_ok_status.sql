-- 서비스 지도 API 의 마지막 성공 응답 코드 — E2E 미룬 삭제가 그 코드로 답한다 (도메인/시나리오 §3.7 결정 12)
-- 칸은 「서비스 지도 표」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 정식 실행 trace 가 본 그 API 의 마지막 2xx 코드. NULL 이면 성공 응답을 못 봤다(화면 줄만 있거나 4xx · 5xx 만 봤다)
ALTER TABLE service_api ADD COLUMN ok_status INTEGER CHECK (ok_status IS NULL OR ok_status BETWEEN 200 AND 299);

-- migrate:down

ALTER TABLE service_api DROP COLUMN IF EXISTS ok_status;
