-- 프로젝트의 API 서버 이름 — 호스트(서비스 지도 service_api.host)에 사람이 붙인 이름 (docs/spec/공통/4-데이터모델.md 「API 서버 이름 표」 · PRJ-F1-04)

-- migrate:up

-- 이름은 프로젝트마다 붙는다(그 안의 모든 애플리케이션이 같은 인증 서버를 쓰므로). 같은 이름을 호스트 여럿에 써도 된다 — 운영 · 검증 서버를 한 이름으로 묶는다
CREATE TABLE project_api_server (
  project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  host       TEXT   NOT NULL CHECK (host = lower(host) AND length(host) BETWEEN 1 AND 255),
  name       TEXT   NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 20),
  PRIMARY KEY (project_id, host)
);

-- migrate:down

DROP TABLE IF EXISTS project_api_server;
