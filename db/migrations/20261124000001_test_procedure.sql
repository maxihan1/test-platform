-- 테스트 프로시저 표 — 실행 단위 run_exec 와 케이스 줄 · 케이스 · 호환성 · 애플리케이션의 프로시저 칸 (2026-11-23 사용자 · TP-F2-09)
-- 정본은 docs/spec/공통/4-데이터모델.md 「테스트 프로시저 표」. 칸을 고치면 그 SQL 과 db/procedure-columns.test.ts 를 같이 고친다
-- 더하기만 한다 — 지우거나 뜻을 바꾸는 칸이 없고 옛 실행 기록은 그대로다. 이 줄에서 쓰는 것은 test_case 세 칸과 스위치 읽기뿐이고 나머지는 실행 줄(TP-F2-10 · 11)이 쓴다
-- grafana_ro 에 아무것도 주지 않는다. run_item · test_case · service 는 칸마다 열어 둔 것이라 새 칸은 자동으로 안 붙는다

-- migrate:up

-- 실행 단위 — Playwright 프로세스 하나가 돈 한 번. 프로시저면 케이스 줄 여럿이, 옛 꼴 케이스면 한 줄이 가리킨다.
-- 번호는 run_item.history_id 와 같은 번호 줄이다 — 러너가 historyId 하나로 자식 · 중단 · 진행 · 폴더를 가르니 따로 세면 부딪힌다 (compat_run_case.id 와 같은 방식)
CREATE TABLE run_exec (
  exec_id     BIGINT      PRIMARY KEY DEFAULT nextval('run_item_history_id_seq'::regclass),
  run_id      BIGINT      NOT NULL REFERENCES test_run(run_id),
  file_path   TEXT        NOT NULL,
  proc_id     TEXT,
  proc_name   TEXT,
  platform    TEXT        NOT NULL,
  attempt     INTEGER     NOT NULL DEFAULT 1,
  timeout_ms  INTEGER     NOT NULL,
  -- 케이스 판정 밖의 사유뿐이다. 판정은 케이스 줄에서 센다 — 두 곳에 적으면 어긋난다
  error       JSONB,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  CHECK ((proc_id IS NULL) = (proc_name IS NULL))
);
CREATE INDEX ON run_exec (run_id);

ALTER TABLE run_item
  ADD COLUMN exec_id          BIGINT REFERENCES run_exec(exec_id),
  ADD COLUMN exec_seq         INTEGER,
  ADD COLUMN blocked_by       TEXT,
  ADD COLUMN case_started_at  TIMESTAMPTZ,
  ADD COLUMN case_finished_at TIMESTAMPTZ;

-- 스캐너가 채우고 다시 스캔하면 덮어쓴다. 옛 꼴 케이스는 셋 다 NULL 이다
ALTER TABLE test_case
  ADD COLUMN proc_id   TEXT,
  ADD COLUMN proc_seq  INTEGER,
  ADD COLUMN proc_name TEXT,
  ADD CONSTRAINT test_case_proc_check CHECK ((proc_id IS NULL) = (proc_seq IS NULL) AND (proc_id IS NULL) = (proc_name IS NULL));

-- exec_id 는 외래 키가 아니다 — 호환성은 run_exec 줄을 만들지 않고 같은 번호 줄에서 번호만 뽑아 그 프로시저의 케이스 줄들이 나눠 든다
ALTER TABLE compat_run_case
  ADD COLUMN exec_id    BIGINT,
  ADD COLUMN blocked_by TEXT;

-- 「프로시저 작성」 스위치. 웹 · API 는 케이스마다 깨끗한 창으로 시작하는 지금 꼴이라 켜지 못한다
ALTER TABLE service
  ADD COLUMN procedure_mode BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT service_procedure_mode_check CHECK (NOT procedure_mode OR kind IN ('APP', 'GAME'));

-- migrate:down

ALTER TABLE service DROP CONSTRAINT service_procedure_mode_check, DROP COLUMN procedure_mode;
ALTER TABLE compat_run_case DROP COLUMN exec_id, DROP COLUMN blocked_by;
ALTER TABLE test_case DROP CONSTRAINT test_case_proc_check, DROP COLUMN proc_id, DROP COLUMN proc_seq, DROP COLUMN proc_name;
ALTER TABLE run_item DROP COLUMN exec_id, DROP COLUMN exec_seq, DROP COLUMN blocked_by, DROP COLUMN case_started_at, DROP COLUMN case_finished_at;
DROP TABLE run_exec;
