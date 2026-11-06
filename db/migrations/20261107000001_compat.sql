-- 기기 호환성 표 — 세트 · 점검 상태 · 케이스 한 번 · 점검 화면 · 판정과 test_run 의 kind COMPAT (COMPAT-F1-02)
-- 정본은 docs/spec/공통/4-데이터모델.md 「호환성 표」 · 도메인/호환성 §3.13. 칸을 고치면 그 SQL 과 db/compat-columns.test.ts 를 같이 고친다
-- grafana_ro 에 아무것도 주지 않는다. 2026-09-17 에 기본 허용을 껐으므로 새 표는 자동으로 안 붙는다 (scenario 와 같다)

-- migrate:up

CREATE TABLE compat_set (
  id            BIGSERIAL   PRIMARY KEY,
  service_id    BIGINT      NOT NULL REFERENCES service(id),
  name          TEXT        NOT NULL,
  -- [{ serial, model, name }] 고른 차례가 실행 순서다. model · name 은 고를 때의 사본이라 디바이스가 빠져도 목록이 읽힌다
  devices       JSONB       NOT NULL CHECK (jsonb_typeof(devices) = 'array'),
  one_per_model BOOLEAN     NOT NULL DEFAULT true,
  -- 외래 키를 걸지 않는다 — 케이스가 지워져도 세트는 남고 실행 때 건너뛴다 (req_case 와 같은 까닭)
  added_cases   TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE test_run DROP CONSTRAINT test_run_kind_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_kind_check CHECK (kind IN ('UI','FN','SCENARIO','COMPAT'));
ALTER TABLE test_run
  ADD COLUMN compat_set_id BIGINT REFERENCES compat_set(id),
  ADD CONSTRAINT test_run_compat_check CHECK ((kind = 'COMPAT') = (compat_set_id IS NOT NULL));

CREATE TABLE compat_run_device (
  run_id      BIGINT      NOT NULL REFERENCES test_run(run_id),
  seq         INTEGER     NOT NULL CHECK (seq >= 1),
  serial      TEXT        NOT NULL,
  model       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  fold        TEXT        CHECK (fold IN ('OPEN','FOLDED')),
  state       TEXT        NOT NULL DEFAULT 'WAIT' CHECK (state IN ('WAIT','RUNNING','CHECKING','DONE','SKIPPED','STOPPED')),
  skip_reason TEXT,
  -- 잡자마자 쓰고 놓으면 지운다 — 중단 · admin 다시 켜기가 이 칸을 보고 놓는다
  held_serial TEXT,
  device      JSONB,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (run_id, seq)
);

CREATE TABLE compat_run_case (
  -- run_item.history_id 와 같은 번호 줄이다 — 러너가 historyId 하나로 자식 · 중단 · 진행을 가르니 따로 세면 부딪힌다.
  -- 이름 글자가 아니라 regclass 로 묶어야 번호 줄을 지우거나 바꿀 때 postgres 가 막아 준다
  id          BIGINT      PRIMARY KEY DEFAULT nextval('run_item_history_id_seq'::regclass),
  run_id      BIGINT      NOT NULL,
  seq         INTEGER     NOT NULL,
  tc_id       TEXT        NOT NULL,
  tc_name     TEXT        NOT NULL,
  picked      TEXT        NOT NULL CHECK (picked IN ('AUTO','ADDED')),
  file_path   TEXT        NOT NULL,
  timeout_ms  INTEGER     NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'NA' CHECK (status IN ('PASS','FAIL','NA')),
  failed_step INTEGER,
  steps       JSONB       NOT NULL DEFAULT '[]',
  check_state TEXT        CHECK (check_state IN ('checking','done','failed','limit','missing')),
  error       JSONB,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  FOREIGN KEY (run_id, seq) REFERENCES compat_run_device(run_id, seq),
  UNIQUE (run_id, seq, tc_id)
);

-- 의심 없는 화면도 남긴다 — 「점검 화면」 · 「이상 없음」을 센다
CREATE TABLE compat_screen (
  id          BIGSERIAL   PRIMARY KEY,
  case_run_id BIGINT      NOT NULL REFERENCES compat_run_case(id) ON DELETE CASCADE,
  run_id      BIGINT      NOT NULL,
  seq         INTEGER     NOT NULL,
  screen_key  TEXT        NOT NULL,
  step        INTEGER,
  at          TIMESTAMPTZ NOT NULL,
  before      TEXT        NOT NULL,
  status      TEXT        NOT NULL CHECK (status IN ('done','failed','skipped')),
  issues      JSONB       NOT NULL DEFAULT '[]',
  file        TEXT
);
CREATE INDEX ON compat_screen (run_id, screen_key, seq);

-- 칸(화면 × 점검 상태)마다 하나. 줄이 없으면 미판정이다. screen_key 는 화면 줄마다라 외래 키를 못 건다 — 서버가 본다
CREATE TABLE compat_verdict (
  run_id     BIGINT      NOT NULL,
  screen_key TEXT        NOT NULL,
  seq        INTEGER     NOT NULL,
  verdict    TEXT        NOT NULL CHECK (verdict IN ('CONFIRMED','NOT_DEFECT')),
  judged_by  TEXT        NOT NULL,
  judged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (run_id, seq) REFERENCES compat_run_device(run_id, seq),
  PRIMARY KEY (run_id, screen_key, seq)
);

-- migrate:down

-- 호환성 실행을 먼저 지운다. 안 지우면 kind 제약을 되돌릴 때 걸린다
DROP TABLE IF EXISTS compat_verdict;
DROP TABLE IF EXISTS compat_screen;
DROP TABLE IF EXISTS compat_run_case;
DROP TABLE IF EXISTS compat_run_device;
DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE kind = 'COMPAT');
DELETE FROM test_run WHERE kind = 'COMPAT';
ALTER TABLE test_run
  DROP CONSTRAINT IF EXISTS test_run_compat_check,
  DROP COLUMN IF EXISTS compat_set_id;
ALTER TABLE test_run DROP CONSTRAINT test_run_kind_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_kind_check CHECK (kind IN ('UI','FN','SCENARIO'));
DROP TABLE IF EXISTS compat_set;
