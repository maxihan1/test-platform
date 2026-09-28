-- E2E 시나리오 표 — 시나리오 · 버전 · 부품 결과 · 절차 결과와 test_run 의 kind
-- 본문은 「E2E 시나리오 표」 계약 블록 SQL 을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md).
-- 표 단위 CHECK 둘에만 검사용 이름을 붙였다 — 이름이 없으면 _check·_check1 로 붙어 거절 검사가 어느 제약인지 못 가른다

-- migrate:up

-- 시나리오 한 개. 지우지 않는다 — 지난 실행이 가리킨다
CREATE TABLE scenario (
  id         BIGSERIAL PRIMARY KEY,
  service_id BIGINT      NOT NULL REFERENCES service(id),
  name       TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_by TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 저장할 때마다 한 행. 고치지 않는다 — 되돌리기도 새 행이다 (결정 7)
CREATE TABLE scenario_version (
  scenario_id   BIGINT      NOT NULL REFERENCES scenario(id),
  version       INTEGER     NOT NULL CHECK (version >= 1),
  platform      TEXT        NOT NULL DEFAULT 'desktop' CHECK (platform IN ('desktop','mobile')),  -- 한 브라우저 = 디바이스 하나. 버전마다 둔다 — 바꾼 뒤에도 옛 실행의 디바이스가 남는다
  parts         JSONB       NOT NULL,   -- ScenarioPart[] (공통/3-공유계약 §5.1). 순서가 곧 부품 순서다
  saved_by      TEXT        NOT NULL,
  saved_by_name TEXT        NOT NULL,   -- 스냅샷. 이력에 사람 이름을 적는다
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scenario_id, version)
);

-- 실행 묶음은 test_run 한 행이다. 케이스 실행과 가르는 칸
ALTER TABLE test_run
  ADD COLUMN kind             TEXT    NOT NULL DEFAULT 'CASE' CHECK (kind IN ('CASE','SCENARIO')),
  ADD COLUMN scenario_id      BIGINT  REFERENCES scenario(id),
  ADD COLUMN scenario_version INTEGER,
  ADD CONSTRAINT test_run_scenario_check
    CHECK ((kind = 'SCENARIO') = (scenario_id IS NOT NULL AND scenario_version IS NOT NULL));

-- 부품 하나의 결과. 실행을 만들 때 NA 로 줄을 다 세운다 — run_item 과 같다
CREATE TABLE scenario_run_part (
  id            BIGSERIAL PRIMARY KEY,
  run_id        BIGINT      NOT NULL REFERENCES test_run(run_id),
  seq           INTEGER     NOT NULL,   -- 1부터
  kind          TEXT        NOT NULL CHECK (kind IN ('case','api','mock','unmock','wait')),
  tc_id         TEXT,                   -- case 부품만
  tc_name       TEXT,                   -- 스냅샷
  part          JSONB       NOT NULL,   -- 스냅샷. 그때의 부품 정의와 입력값 (결정 8)
  -- 아래 넷은 case 부품만 찬다. run_item 이 박제하는 것과 같은 까닭이다 — 증적의 입력·기대 칸 라벨을 카탈로그(캐시)에서 읽으면 안 된다
  file_path       TEXT,                 -- 스냅샷
  param_schema    JSONB,                -- 스냅샷. 증적의 입력 칸 '라벨'
  expected_schema JSONB,                -- 스냅샷. 증적의 기대결과 칸 '라벨'
  timeout_ms      INTEGER,              -- 스냅샷. 이 부품 몫으로 친 제한 시간
  precondition  JSONB       NOT NULL DEFAULT '[]',   -- 스냅샷. case 부품의 사전조건 칸
  skipped_steps JSONB       NOT NULL DEFAULT '[]',   -- 실제로 건너뛴 절차 제목
  mocks         JSONB       NOT NULL DEFAULT '[]',   -- 이 부품이 도는 동안 걸려 있던 mock 의 urlPattern
  status        TEXT        NOT NULL,   -- PASS | FAIL | NA
  duration_ms   INTEGER,
  error         JSONB,                  -- 부품 마감 오류(NOT_RUN · TIMEOUT · ABORTED)도 여기. 값의 정본은 도메인/시나리오 §3.7 결정 9
  finished_at   TIMESTAMPTZ,
  UNIQUE (run_id, seq),
  CONSTRAINT scenario_run_part_case_tc_check CHECK ((kind = 'case') = (tc_id IS NOT NULL)),
  CONSTRAINT scenario_run_part_case_snapshot_check
    CHECK (kind <> 'case' OR (file_path IS NOT NULL AND param_schema IS NOT NULL AND expected_schema IS NOT NULL AND timeout_ms IS NOT NULL))
);

-- case 부품의 절차. run_item_step 과 같은 모양이고 건너뜀 칸이 하나 더 있다
CREATE TABLE scenario_run_step (
  id              BIGSERIAL PRIMARY KEY,
  part_id         BIGINT  NOT NULL REFERENCES scenario_run_part(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,     -- 시나리오 전체에서 이어진 순번
  title           TEXT    NOT NULL,
  status          TEXT    NOT NULL,
  skipped         BOOLEAN NOT NULL DEFAULT false,
  duration_ms     INTEGER,
  assertions      JSONB   NOT NULL DEFAULT '[]',
  line            INTEGER,
  screenshot_path TEXT,
  http_trace      JSONB,                -- 상세 화면용. 증적에는 안 싣는다 (도메인/리포팅 §8.4)
  error           JSONB,
  UNIQUE (part_id, seq)
);

-- grafana_ro 에 아무것도 주지 않는다. 2026-09-17 에 기본 허용을 껐으므로 새 표는 자동으로 안 붙는다.
-- test_run 은 표 단위 SELECT 라 새 칸도 따라간다 — 대시보드 질의가 kind = 'CASE' 를 달 자리다 (도메인/리포팅 §8.5)

-- migrate:down

-- 시나리오 실행을 먼저 지운다. 안 지우면 칸이 사라진 뒤 케이스 실행 행으로 남는다
DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE kind = 'SCENARIO');
DROP TABLE IF EXISTS scenario_run_step;
DROP TABLE IF EXISTS scenario_run_part;
DELETE FROM test_run WHERE kind = 'SCENARIO';
ALTER TABLE test_run
  DROP CONSTRAINT IF EXISTS test_run_scenario_check,
  DROP COLUMN IF EXISTS scenario_version,
  DROP COLUMN IF EXISTS scenario_id,
  DROP COLUMN IF EXISTS kind;
DROP TABLE IF EXISTS scenario_version;
DROP TABLE IF EXISTS scenario;
