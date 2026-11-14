-- QA 리포트 표 · 실행 항목 테스트 버전 칸 · 성능 실행 빌드 칸 · AI 종류 REPORT_RISK (docs/spec/공통/4-데이터모델.md 「QA 리포트 표」 · 도메인/리포팅 §3.17 · QAR-F1-02)
-- 리포트는 지우지 않는다. 애플리케이션 · 프로젝트를 지워도 남게 외래 키는 SET NULL 이고 이름 사본으로 선다 — 승인한 PDF 를 감사인이 맞춰 볼 기록이 사라지면 안 된다
-- 담은 실행 번호는 배열로 두고 외래 키를 걸지 않는다 — 실행을 지우는 길이 리포트에 막히지 않게
-- grafana_ro 에는 안 준다 — 어느 패널도 안 읽는다

-- migrate:up

CREATE TABLE qa_report (
  id            BIGSERIAL   PRIMARY KEY,
  bundle_key    TEXT        NOT NULL,
  service_id    BIGINT      REFERENCES service(id) ON DELETE SET NULL,
  service_name  TEXT        NOT NULL,
  env           TEXT        NOT NULL,
  build_no      TEXT,
  run_id        BIGINT,
  perf_run_id   BIGINT,
  version       INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
  run_ids       BIGINT[]    NOT NULL DEFAULT '{}',
  perf_run_ids  BIGINT[]    NOT NULL DEFAULT '{}',
  performers    TEXT[]      NOT NULL DEFAULT '{}',
  summary       JSONB       NOT NULL,
  ai            JSONB,
  ai_job_id     BIGINT      REFERENCES perf_ai_job(id) ON DELETE SET NULL,
  approved_by   TEXT,
  approved_name TEXT,
  approved_at   TIMESTAMPTZ,
  pdf_path      TEXT,
  pdf_sha256    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(build_no, run_id, perf_run_id) = 1),
  CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  CHECK ((approved_at IS NULL) = (pdf_sha256 IS NULL)),
  CHECK ((approved_at IS NULL) = (pdf_path IS NULL)),
  UNIQUE (bundle_key, version)
);
-- 묶음마다 승인 전 버전은 하나 — 실행이 끝날 때마다 이 줄을 다시 만든다
CREATE UNIQUE INDEX ON qa_report (bundle_key) WHERE approved_at IS NULL;

CREATE TABLE qa_project_report (
  id           BIGSERIAL   PRIMARY KEY,
  project_id   BIGINT      REFERENCES project(id) ON DELETE SET NULL,
  project_name TEXT        NOT NULL,
  period_from  DATE        NOT NULL,
  period_to    DATE        NOT NULL,
  tz           TEXT        NOT NULL,
  origin       TEXT        NOT NULL CHECK (origin IN ('MANUAL', 'SCHEDULED')),
  body         JSONB       NOT NULL,
  ai           JSONB,
  ai_job_id    BIGINT      REFERENCES perf_ai_job(id) ON DELETE SET NULL,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 양 끝을 넣어 92일까지
  CHECK (period_to >= period_from AND period_to - period_from < 92)
);

-- 이 칸이 생기기 전 항목은 NULL 이고 리포트는 「기록 없음」으로 적는다
ALTER TABLE run_item ADD COLUMN tests_commit TEXT;
ALTER TABLE run_item ADD COLUMN case_sha256  TEXT;

ALTER TABLE perf_run ADD COLUMN build_no TEXT;

ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN', 'SUGGEST_FLOWS', 'STAB_SUMMARY', 'REPORT_RISK'));

-- migrate:down

DROP TABLE qa_project_report;
DROP TABLE qa_report;
DELETE FROM perf_ai_job WHERE kind = 'REPORT_RISK';
ALTER TABLE perf_ai_job DROP CONSTRAINT perf_ai_job_kind_check;
ALTER TABLE perf_ai_job ADD CONSTRAINT perf_ai_job_kind_check
  CHECK (kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE', 'SUGGEST_LOAD', 'SUGGEST_TARGETS', 'SUGGEST_PAGES', 'SUGGEST_DEVICES', 'ANALYZE_RUN', 'SUGGEST_FLOWS', 'STAB_SUMMARY'));
ALTER TABLE perf_run DROP COLUMN build_no;
ALTER TABLE run_item DROP COLUMN case_sha256;
ALTER TABLE run_item DROP COLUMN tests_commit;
