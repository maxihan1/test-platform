-- 프로젝트의 대표 애플리케이션 칸 (공통/4-데이터모델 「프로젝트 표」 「대표 애플리케이션」 · 2026-11-10 사용자)
-- 비면 대표가 없다. 그 프로젝트의 애플리케이션인지는 설정 API 가 막고, 읽는 쪽도 같은 프로젝트일 때만 대표로 본다

-- migrate:up

ALTER TABLE project ADD COLUMN primary_service_id BIGINT REFERENCES service(id) ON DELETE SET NULL;

-- 대표를 다른 프로젝트로 옮기면 옛 프로젝트의 대표 칸을 비운다 — 남기면 되돌려 옮길 때 아무도 고르지 않았는데 다시 대표가 된다.
-- 옮기는 길(설정 API · 손 SQL)이 어디든 같게 하려고 트리거에 둔다 (빈 프로젝트 지우기 트리거와 같은 까닭)
CREATE FUNCTION service_moved_clear_primary() RETURNS trigger AS $$
BEGIN
  UPDATE project SET primary_service_id = NULL WHERE id = OLD.project_id AND primary_service_id = OLD.id;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER service_moved_clear_primary AFTER UPDATE OF project_id ON service
  FOR EACH ROW WHEN (OLD.project_id IS DISTINCT FROM NEW.project_id)
  EXECUTE FUNCTION service_moved_clear_primary();

-- migrate:down

DROP TRIGGER IF EXISTS service_moved_clear_primary ON service;
DROP FUNCTION IF EXISTS service_moved_clear_primary();
ALTER TABLE project DROP COLUMN IF EXISTS primary_service_id;
