-- 애플리케이션(service)을 묶는 프로젝트 층 (공통/4-데이터모델 「프로젝트 표」 · PRJ-F1-01)
-- 칸은 service 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

CREATE TABLE project (
  id         BIGSERIAL   PRIMARY KEY,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service ADD COLUMN project_id BIGINT REFERENCES project(id);

-- 지금 있는 애플리케이션은 저마다 같은 이름의 프로젝트 하나에 넣는다. 묶을 것은 사람이 옮긴다
DO $$
DECLARE
  s   RECORD;
  pid BIGINT;
BEGIN
  FOR s IN SELECT id, name FROM service ORDER BY id LOOP
    INSERT INTO project (name) VALUES (s.name) RETURNING id INTO pid;
    UPDATE service SET project_id = pid WHERE id = s.id;
  END LOOP;
END $$;

-- 프로젝트를 안 주고 만들면 같은 이름의 프로젝트를 만들어 붙인다 — 만드는 쪽(설정 · 검사 fixture)이 프로젝트를 몰라도 된다.
-- 같은 접두사가 이미 있으면 그 프로젝트를 쓴다. ON CONFLICT 로 끝나는 INSERT 도 이 트리거를 먼저 지나 빈 프로젝트가 쌓인다
CREATE FUNCTION service_default_project() RETURNS trigger AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT project_id INTO NEW.project_id FROM service WHERE prefix = NEW.prefix;
    IF NEW.project_id IS NULL THEN
      INSERT INTO project (name) VALUES (NEW.name) RETURNING id INTO NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER service_default_project BEFORE INSERT ON service
  FOR EACH ROW EXECUTE FUNCTION service_default_project();

ALTER TABLE service ALTER COLUMN project_id SET NOT NULL;

-- 서비스 행을 지우는 것은 DB 검사 fixture 뿐이다(제품은 is_active 로 끈다). 남은 애플리케이션이 없는 프로젝트도 같이 지워야
-- 트리거가 만든 빈 프로젝트가 검사마다 쌓이지 않는다
CREATE FUNCTION service_drop_empty_project() RETURNS trigger AS $$
BEGIN
  DELETE FROM project p WHERE p.id = OLD.project_id AND NOT EXISTS (SELECT 1 FROM service s WHERE s.project_id = p.id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER service_drop_empty_project AFTER DELETE ON service
  FOR EACH ROW EXECUTE FUNCTION service_drop_empty_project();

-- migrate:down

DROP TRIGGER IF EXISTS service_drop_empty_project ON service;
DROP FUNCTION IF EXISTS service_drop_empty_project();
DROP TRIGGER IF EXISTS service_default_project ON service;
DROP FUNCTION IF EXISTS service_default_project();
ALTER TABLE service DROP COLUMN IF EXISTS project_id;
DROP TABLE IF EXISTS project;
