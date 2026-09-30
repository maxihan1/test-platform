-- 남은 요구로 이어 작성 — 반영 끝난 작성 요청의 남은 요구를 맡는 새 작성 요청이 원본을 가리킨다
-- 본문은 「작성 이어 작성 칸」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 이어 작성한 원본 요청(뿌리). 새 번호 · 새 PR 인 작성 요청이라 AUTHOR 에만 붙는다 — 재실행 · 머지는 뿌리 것을 따른다
ALTER TABLE authoring_request ADD COLUMN continue_from BIGINT REFERENCES authoring_request(id);
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_continue_from_check
  CHECK (continue_from IS NULL OR kind = 'AUTHOR');
-- 한 원본의 남은 요구를 두 요청이 따로 맡으면 같은 요구사항 표를 두 PR 이 고친다. 둘이 동시에 눌러도 여기서 한쪽만 선다.
-- 폐기한 것은 빠진다 — 폐기하면 원본에서 다시 이어 작성할 수 있다
CREATE UNIQUE INDEX authoring_request_continue_from_once ON authoring_request (continue_from)
  WHERE continue_from IS NOT NULL AND discarded_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS authoring_request_continue_from_once;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_continue_from_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS continue_from;
