-- 작성 이어하기 — 중단 이유 둘(작성 중 끊김 · 올리기 거절) · 재실행이 이어받은 중단 요청
-- 본문은 「작성 이어하기 칸」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 자식이 일하다 끊긴 것과 올리기에서 거절된 것도 이어갈 수 있어 중단이다. 실패는 자식을 띄우기 전 문제만 남는다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_stop_reason_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_stop_reason_check
  CHECK (stop_reason IN ('USER', 'TIMEOUT', 'LIMIT', 'AGENT_RESTART', 'AGENT_LOST', 'CRASH', 'REJECTED'));

-- 이어받은 중단 요청. 작업 폴더를 넘겨받는 줄이라 재실행에만 붙는다
ALTER TABLE authoring_request ADD COLUMN resume_from BIGINT REFERENCES authoring_request(id);
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_resume_from_check
  CHECK (resume_from IS NULL OR kind = 'RERUN');
-- 폴더는 하나라 두 줄이 같은 것을 넘겨받으면 한쪽은 빈손이다. 둘이 동시에 눌러도 여기서 한쪽만 선다
CREATE UNIQUE INDEX authoring_request_resume_from_once ON authoring_request (resume_from) WHERE resume_from IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS authoring_request_resume_from_once;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_resume_from_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS resume_from;
-- 옛 이유 목록에는 둘이 없다 — 이 PR 전처럼 실패로 되돌린다. 실패에는 이유·누가가 비어야 한다(stopped_pair_check)
UPDATE authoring_request
   SET status = 'FAILED', stop_reason = NULL, stopped_by = NULL,
       error = COALESCE(error, '중단됨 (되돌리기)')
 WHERE stop_reason IN ('CRASH', 'REJECTED');
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_stop_reason_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_stop_reason_check
  CHECK (stop_reason IN ('USER', 'TIMEOUT', 'LIMIT', 'AGENT_RESTART', 'AGENT_LOST'));
