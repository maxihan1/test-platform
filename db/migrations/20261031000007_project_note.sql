-- 프로젝트 노트 · 노트를 고칠 사건 · 작성 요청 종류 NOTE (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F4-03)

-- migrate:up

-- 저장할 때마다 한 행이다(prd_version 본보기). AI 가 실패하면 행이 안 생겨 앞 버전이 남는다
-- docs 는 [{ name, summary, body }] — 목차는 name · summary 로 서고 body 는 md 글이다. 문서 길이 · 개수 상한은 코드 상수가 정본(projectNote/note.ts)
CREATE TABLE project_note (
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL CHECK (version >= 1),
  docs        JSONB       NOT NULL CHECK (jsonb_typeof(docs) = 'array'),
  request_id  BIGINT      REFERENCES authoring_request(id) ON DELETE SET NULL,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, version)
);

-- 노트를 고칠 사건. 집을 때 아직 반영 안 된 줄에 request_id 를 적어 한 번에 넘긴다
CREATE TABLE project_note_event (
  id          BIGSERIAL   PRIMARY KEY,
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL CHECK (kind IN ('DEPLOY', 'TASK_DONE', 'ISSUE_OPEN', 'ISSUE_CLOSE', 'PR_MERGED', 'PRD_VERSION', 'AUTHORING_DONE')),
  payload     JSONB       NOT NULL,
  request_id  BIGINT      REFERENCES authoring_request(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON project_note_event (project_id, id);

-- NOTE 는 애플리케이션이 아니라 프로젝트의 일이라 service_id 를 비우고 project_id 를 채운다(도메인/BTS 결정 19)
ALTER TABLE authoring_request ALTER COLUMN service_id DROP NOT NULL;
-- 빈 프로젝트 지우기(service_drop_empty_project)가 노트 요청과 같이 지운다
ALTER TABLE authoring_request ADD COLUMN project_id BIGINT REFERENCES project(id) ON DELETE CASCADE;
-- 줄마다 애플리케이션 · 프로젝트 둘 중 하나만 찬다. 프로젝트 칸은 NOTE 와 그 RERUN 만 — NOT NULL 을 뗀 자리를 이 셋이 다시 막는다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_scope_check
  CHECK ((service_id IS NULL) <> (project_id IS NULL));
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_note_scope_check
  CHECK (kind <> 'NOTE' OR project_id IS NOT NULL);
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_project_kind_check
  CHECK (project_id IS NULL OR kind IN ('NOTE', 'RERUN'));
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT', 'NOTE'));
-- NOTE 는 뿌리라 가리키는 줄이 없다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT', 'NOTE')) = (source_id IS NULL));
-- 프로젝트마다 열린 노트 고치기는 하나 — 사건 둘이 동시에 와도 줄이 둘 서지 않는다(ON CONFLICT DO NOTHING 이 기댄다)
CREATE UNIQUE INDEX authoring_request_note_open ON authoring_request (project_id) WHERE project_id IS NOT NULL AND status IN ('PENDING', 'RUNNING');

-- migrate:down

DROP INDEX IF EXISTS authoring_request_note_open;
DELETE FROM authoring_request WHERE project_id IS NOT NULL;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT')) = (source_id IS NULL));
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT'));
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_project_kind_check;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_note_scope_check;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_scope_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS project_id;
ALTER TABLE authoring_request ALTER COLUMN service_id SET NOT NULL;
DROP TABLE IF EXISTS project_note_event;
DROP TABLE IF EXISTS project_note;
