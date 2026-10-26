-- 표준 기획서 판의 출처 「테스트 작성에서 결정」(DECISION)과 무엇이 바뀌었나(changes) 칸 (진행판 WEB-F6-04)
-- 칸은 docs/spec/공통/4-데이터모델.md 「prd_version」의 2026-10-26 줄과 도메인/작성 §7 「결정 목록 통로」를 따른다

-- migrate:up

-- DECISION 은 결정 진행이 저장한 버전이다 — 사람이 고른 것이라 request_id 가 없다(아래 CHECK 는 그대로 AGENT 만 request_id 를 단다)
ALTER TABLE prd_version DROP CONSTRAINT prd_version_source_check;
ALTER TABLE prd_version ADD CONSTRAINT prd_version_source_check CHECK (source IN ('AGENT','PERSON','REVERT','DECISION'));
-- [{ kind: 'EDIT'|'PICK'|'CONFIRM', reqId, text, asset, tcId }]. DECISION 버전과 화면이 맞음 요청이 올린 AGENT 버전만 채운다.
-- 그 밖은 NULL — 화면이 앞 판과 견준다
ALTER TABLE prd_version ADD COLUMN changes JSONB;

-- migrate:down

ALTER TABLE prd_version DROP COLUMN IF EXISTS changes;
ALTER TABLE prd_version DROP CONSTRAINT prd_version_source_check;
ALTER TABLE prd_version ADD CONSTRAINT prd_version_source_check CHECK (source IN ('AGENT','PERSON','REVERT'));
