-- 작성 요청의 중단(STOPPED)·폐기·진척 칸 (docs/spec/도메인/작성.md §7 「중단 · 폐기 · 진척」 · 공통/4-데이터모델 「작성 중단 · 폐기 · 진척 칸」)

-- migrate:up

ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_status_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_status_check
  CHECK (status IN ('DRAFT', 'PENDING', 'RUNNING', 'DONE', 'FAILED', 'STOPPED'));

-- 멈춰 달라고 한 때와 사람 — 에이전트가 다음 신호에 멈춘다. 처음 누른 사람을 지킨다
ALTER TABLE authoring_request ADD COLUMN stop_requested_at TIMESTAMPTZ;
ALTER TABLE authoring_request ADD COLUMN stop_requested_by TEXT;
-- 실제로 멈췄을 때만 찬다 — 사람 아이디 또는 system. 요청만 하고 먼저 끝난 행에는 비어 있다
ALTER TABLE authoring_request ADD COLUMN stopped_by TEXT;
ALTER TABLE authoring_request ADD COLUMN stop_reason TEXT;
ALTER TABLE authoring_request ADD COLUMN discarded_at TIMESTAMPTZ;
ALTER TABLE authoring_request ADD COLUMN progress JSONB;

-- 모르는 이유가 들어오면 화면·대시보드 거르기가 조용히 빠뜨린다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_stop_reason_check
  CHECK (stop_reason IN ('USER', 'TIMEOUT', 'LIMIT', 'AGENT_RESTART', 'AGENT_LOST'));
-- 중단이면 이유와 누가가 반드시, 아니면 둘 다 없다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_stopped_pair_check
  CHECK ((status = 'STOPPED') = (stop_reason IS NOT NULL AND stopped_by IS NOT NULL));

-- 대시보드는 중단을 이유별로 센다. 누가 멈췄는지(아이디)는 열지 않는다
GRANT SELECT (stop_reason) ON authoring_request TO grafana_ro;

-- migrate:down

REVOKE SELECT (stop_reason) ON authoring_request FROM grafana_ro;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_stopped_pair_check;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_stop_reason_check;
-- 옛 상태 목록에는 STOPPED 가 없다 — 실패로 되돌린다. 폐기한 행은 목록에 다시 보인다
UPDATE authoring_request SET status = 'FAILED', error = COALESCE(error, '중단됨 (되돌리기)') WHERE status = 'STOPPED';
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_status_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_status_check
  CHECK (status IN ('DRAFT', 'PENDING', 'RUNNING', 'DONE', 'FAILED'));
ALTER TABLE authoring_request DROP COLUMN IF EXISTS progress;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS discarded_at;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS stop_reason;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS stopped_by;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS stop_requested_by;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS stop_requested_at;
