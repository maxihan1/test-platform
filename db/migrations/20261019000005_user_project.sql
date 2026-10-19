-- 권한을 애플리케이션(service)마다가 아니라 프로젝트마다 준다 — user_service 를 user_project 로 (docs/spec/공통/4-데이터모델.md 「프로젝트 표」 · PRJ-F1-02b)

-- migrate:up

CREATE TABLE user_project (
  username   TEXT   NOT NULL REFERENCES app_user(username),
  -- 프로젝트가 지워지면(애플리케이션을 옮겨 비게 된 프로젝트) 그 프로젝트의 권한 줄도 같이 간다
  project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  perm_cases     TEXT NOT NULL DEFAULT 'none' CHECK (perm_cases IN ('none','read','write')),
  perm_runs      TEXT NOT NULL DEFAULT 'none' CHECK (perm_runs IN ('none','read','write')),
  perm_authoring TEXT NOT NULL DEFAULT 'none' CHECK (perm_authoring IN ('none','read','write')),
  CONSTRAINT user_project_perm_check CHECK (perm_cases <> 'none' OR perm_runs <> 'none' OR perm_authoring <> 'none'),
  PRIMARY KEY (username, project_id)
);

-- 이 구간은 이름을 한정하지 않는다 — 검사가 옛 모양의 임시 표에 그대로 돌린다 (apps/admin/src/db/user-project-columns.test.ts)
-- 옮기기 시작
-- 같은 프로젝트에 여러 줄이면 칸마다 높은 쪽 — 'none' < 'read' < 'write' 가 글자 순서와 같아 max 로 된다
INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring)
SELECT us.username, s.project_id, max(us.perm_cases), max(us.perm_runs), max(us.perm_authoring)
  FROM user_service us
  JOIN service s ON s.id = us.service_id
 GROUP BY us.username, s.project_id;
-- 옮기기 끝

DROP TABLE user_service;

-- migrate:down

CREATE TABLE user_service (
  username   TEXT   NOT NULL REFERENCES app_user(username),
  service_id BIGINT NOT NULL REFERENCES service(id),
  perm_cases     TEXT NOT NULL DEFAULT 'none' CHECK (perm_cases IN ('none','read','write')),
  perm_runs      TEXT NOT NULL DEFAULT 'none' CHECK (perm_runs IN ('none','read','write')),
  perm_authoring TEXT NOT NULL DEFAULT 'none' CHECK (perm_authoring IN ('none','read','write')),
  CONSTRAINT user_service_perm_check CHECK (perm_cases <> 'none' OR perm_runs <> 'none' OR perm_authoring <> 'none'),
  PRIMARY KEY (username, service_id)
);

-- 프로젝트 권한을 그 프로젝트의 애플리케이션마다 그대로 펼친다
INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
SELECT up.username, s.id, up.perm_cases, up.perm_runs, up.perm_authoring
  FROM user_project up
  JOIN service s ON s.project_id = up.project_id;

DROP TABLE user_project;
