-- 케이스 고치기 — 어드민이 케이스 삭제 · 기대값 · 확정을 요청하는 새 종류 EDIT. 작성처럼 뿌리라 원본을 비우고,
-- 재실행(다시 적용) · 머지는 이것을 원본으로 가리킨다
-- 정본은 「★ 케이스 고치기」 계약 블록이다 (docs/spec/도메인/작성.md)

-- migrate:up

-- 옛 짝 CHECK 는 이름 없이 만들어져 자동 이름(authoring_request_check)이다. 뜻이 드러나는 이름으로 바꿔 단다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_check;
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE', 'EDIT'));
-- 뿌리(작성 · 고치기)는 원본이 없고 재실행 · 머지는 반드시 있다. 고치기가 원본을 가리키면 어느 PR 을 덮어쓸지 갈린다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_source_pair_check
  CHECK ((kind IN ('AUTHOR', 'EDIT')) = (source_id IS NULL));

-- migrate:down

-- 옛 제약은 EDIT 도, EDIT 를 가리키는 재실행 · 머지도 모른다. 고치기 줄기(원본 · 이어받기로 이어진 것 전부)를 버린다
CREATE TEMP TABLE edit_chain AS
WITH RECURSIVE chain(id) AS (
  SELECT id FROM authoring_request WHERE kind = 'EDIT'
  UNION
  SELECT r.id FROM authoring_request r JOIN chain c ON r.source_id = c.id OR r.resume_from = c.id
)
SELECT id FROM chain;
-- 줄기 밖 행이 줄기를 가리키면 FK 가 지우기를 막는다. 남는 행은 가리킴만 끊는다 — 자료는 요청과 함께 CASCADE 로 사라진다
UPDATE authoring_request SET continue_from = NULL
 WHERE continue_from IN (SELECT id FROM edit_chain) AND id NOT IN (SELECT id FROM edit_chain);
UPDATE authoring_asset SET source_asset_id = NULL
 WHERE source_asset_id IN (SELECT a.id FROM authoring_asset a WHERE a.request_id IN (SELECT id FROM edit_chain))
   AND request_id NOT IN (SELECT id FROM edit_chain);
DELETE FROM authoring_request WHERE id IN (SELECT id FROM edit_chain);
DROP TABLE edit_chain;

ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_source_pair_check;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_kind_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_kind_check
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE'));
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_check
  CHECK ((kind = 'AUTHOR') = (source_id IS NULL));
