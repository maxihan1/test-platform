-- 롤백 배포가 BTS 이슈로 바뀐 PRD 요구를 되돌린 판(ROLLBACK)과 그 판을 세운 배포 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F7-01)

-- migrate:up

ALTER TABLE prd_version DROP CONSTRAINT prd_version_source_check;
ALTER TABLE prd_version ADD CONSTRAINT prd_version_source_check CHECK (source IN ('AGENT','PERSON','REVERT','DECISION','ROLLBACK'));
-- ROLLBACK 판만 채운다 — 버전 기록의 「롤백 · 빌드 N」이 빌드 번호를 읽는다.
-- 같은 빌드를 다시 보내 실패한 배포 줄이 지워지면 비운다(빌드 번호만 안 보인다)
ALTER TABLE prd_version ADD COLUMN deploy_id BIGINT REFERENCES bts_deploy(id) ON DELETE SET NULL;
-- 되돌림 요청은 애플리케이션마다 하나라 배포 한 줄에 못 담는다 — 요청의 params.rollbackDeploy 가 배포를 가리킨다(BTS-F7-01 시작 질문 1)
ALTER TABLE bts_deploy DROP COLUMN revert_request_id;

-- migrate:down

ALTER TABLE bts_deploy ADD COLUMN revert_request_id BIGINT REFERENCES authoring_request(id) ON DELETE SET NULL;
ALTER TABLE prd_version DROP COLUMN IF EXISTS deploy_id;
-- 지우면 판 번호가 비어 뒤 판의 바뀐 것이 없는 판을 가리킨다 — 「되돌림」으로 남긴다
UPDATE prd_version SET source = 'REVERT' WHERE source = 'ROLLBACK';
ALTER TABLE prd_version DROP CONSTRAINT prd_version_source_check;
ALTER TABLE prd_version ADD CONSTRAINT prd_version_source_check CHECK (source IN ('AGENT','PERSON','REVERT','DECISION'));
