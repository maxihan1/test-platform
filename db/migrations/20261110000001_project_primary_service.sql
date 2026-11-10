-- 프로젝트의 대표 애플리케이션 칸 (공통/4-데이터모델 「프로젝트 표」 「대표 애플리케이션」 · 2026-11-10 사용자)
-- 비면 대표가 없다. 그 프로젝트의 애플리케이션인지는 설정 API 가 막고, 읽는 쪽도 같은 프로젝트일 때만 대표로 본다

-- migrate:up

ALTER TABLE project ADD COLUMN primary_service_id BIGINT REFERENCES service(id) ON DELETE SET NULL;

-- migrate:down

ALTER TABLE project DROP COLUMN IF EXISTS primary_service_id;
