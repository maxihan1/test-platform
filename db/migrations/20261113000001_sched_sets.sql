-- 정기 실행 세트 · 담은 줄 · 대상 서버 · 회차 표와 실행의 회차 번호 칸 (docs/spec/공통/4-데이터모델.md 「정기 실행 표」 · 도메인/정기실행 §3.16 · SCHED-F1-02)
-- 옮기기와 옛 service.schedule_* 칸 지우기는 SCHED-F1-04 의 마이그레이션이 옛 점검을 끄는 때 같이 한다 — 그 전까지 옛 점검이 옛 칸을 보고 돈다
-- grafana_ro 에는 안 준다 — 어느 패널도 안 읽는다

-- migrate:up

-- 세트 · 담은 줄은 지우지 않는다(지난 회차 · 실행이 가리킨다). 프로젝트가 지워질 때만 같이 지워진다
CREATE TABLE sched_set (
  id          BIGSERIAL   PRIMARY KEY,
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (btrim(name) <> ''),
  at          TIME        NOT NULL,
  tz          TEXT        NOT NULL,
  days        SMALLINT[],
  once_on     DATE,
  is_on       BOOLEAN     NOT NULL DEFAULT true,
  is_base     BOOLEAN     NOT NULL DEFAULT false,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name),
  CHECK ((days IS NULL) <> (once_on IS NULL)),
  CHECK (days IS NULL OR (cardinality(days) BETWEEN 1 AND 7 AND days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]))
);

-- 케이스 번호 목록은 외래 키 없이 둔다 — 케이스가 지워져도 세트는 남고 그 회차에서만 건너뛴다
CREATE TABLE sched_set_item (
  set_id        BIGINT  NOT NULL REFERENCES sched_set(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL CHECK (seq >= 1),
  kind          TEXT    NOT NULL CHECK (kind IN ('FN','UI','E2E','COMPAT')),
  service_id    BIGINT  NOT NULL REFERENCES service(id),
  tc_ids        TEXT[],
  scenario_id   BIGINT  REFERENCES scenario(id),
  compat_set_id BIGINT  REFERENCES compat_set(id),
  PRIMARY KEY (set_id, seq),
  CHECK ((kind = 'E2E') = (scenario_id IS NOT NULL)),
  CHECK ((kind = 'COMPAT') = (compat_set_id IS NOT NULL)),
  CHECK (tc_ids IS NULL OR (kind IN ('FN','UI') AND cardinality(tc_ids) >= 1))
);

-- service_env 줄은 저장마다 지우고 다시 넣어서 외래 키를 service 에만 건다
CREATE TABLE sched_set_env (
  set_id     BIGINT NOT NULL REFERENCES sched_set(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES service(id),
  env        TEXT   NOT NULL,
  PRIMARY KEY (set_id, service_id)
);

-- 프로젝트마다 RUNNING 하나는 회차에 프로젝트 칸이 없어 DB 가 못 건다 — 1분 점검이 프로젝트 줄을 잠그고 본다(SCHED-F1-04)
CREATE TABLE sched_occurrence (
  id          BIGSERIAL   PRIMARY KEY,
  set_id      BIGINT      NOT NULL REFERENCES sched_set(id) ON DELETE CASCADE,
  planned_on  DATE        NOT NULL,
  planned_at  TIMESTAMPTZ NOT NULL,
  state       TEXT        NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','DONE','SKIPPED')),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  cur_seq     INTEGER,
  notes       JSONB       NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(notes) = 'array'),
  UNIQUE (set_id, planned_on)
);

ALTER TABLE test_run ADD COLUMN sched_occurrence_id BIGINT REFERENCES sched_occurrence(id) ON DELETE SET NULL;

-- migrate:down

ALTER TABLE test_run DROP COLUMN IF EXISTS sched_occurrence_id;
DROP TABLE IF EXISTS sched_occurrence;
DROP TABLE IF EXISTS sched_set_env;
DROP TABLE IF EXISTS sched_set_item;
DROP TABLE IF EXISTS sched_set;
