-- 작성 요청 종류 PRD_DRAFT — 배포가 맡은 BTS 이슈로 쓰는 PRD 초안 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F5-03)

-- migrate:up

-- 초안은 뿌리라 가리키는 줄이 없다. 결과는 result.draft 의 초안 줄이고 PR 은 없다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT', 'NOTE', 'PRD_DRAFT'));
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT', 'NOTE', 'PRD_DRAFT')) = (source_id IS NULL));
-- 초안은 QA 화면을 훑어 대상 서버가 늘 찬다. 대조가 아니라 시작 주소는 없다(compare_check 가 막는다)
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_draft_env_check
  CHECK (kind <> 'PRD_DRAFT' OR (env IS NOT NULL AND NOT compare));

-- migrate:down

DELETE FROM authoring_request WHERE kind = 'PRD_DRAFT';
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_draft_env_check;
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_source_pair_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT', 'NOTE')) = (source_id IS NULL));
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT', 'NOTE'));
