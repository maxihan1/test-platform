-- 작성 요청 종류 BUGFIX — 「개발 요청」 이슈를 맡은 수정 AI (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F6-01)

-- migrate:up

-- 수정 일은 뿌리라 가리키는 줄이 없다. pr_url 은 테스트 저장소가 아니라 대상 코드 저장소의 초안 PR 이다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT', 'NOTE', 'PRD_DRAFT', 'BUGFIX'));
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT', 'NOTE', 'PRD_DRAFT', 'BUGFIX')) = (source_id IS NULL));
-- 같은 이슈를 두 번 맡지 않게 — 기다리거나 도는 수정 일은 이슈마다 하나
CREATE UNIQUE INDEX authoring_request_bugfix_open ON authoring_request ((params->>'issueKey'))
  WHERE kind = 'BUGFIX' AND status IN ('PENDING', 'RUNNING') AND discarded_at IS NULL;

-- migrate:down

DELETE FROM authoring_request WHERE kind = 'BUGFIX';
DROP INDEX IF EXISTS authoring_request_bugfix_open;
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT', 'NOTE', 'PRD_DRAFT')) = (source_id IS NULL));
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT', 'NOTE', 'PRD_DRAFT'));
