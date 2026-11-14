-- 정기 실행 리포트 일정 — 세트 줄에 담을 기간 칸 · 리포트가 어느 회차에서 나왔는지 (docs/spec/공통/4-데이터모델.md 「정기 실행 표」 · 도메인/정기실행 §3.16 「리포트 일정」 · QAR-F1-12)

-- migrate:up

-- 리포트 일정이면 담을 기간(이번 주 · 이번 달). 테스트 세트면 NULL 이고 담은 줄 · 대상 서버가 없다
ALTER TABLE sched_set ADD COLUMN report TEXT CHECK (report IN ('WEEK', 'MONTH'));

-- 리포트 일정 회차가 만든 프로젝트 리포트. 회차 하나에 리포트 하나 — 관리 서버가 만들고 회차를 닫기 전에 꺼져도 다시 켜졌을 때 두 번 안 만든다
ALTER TABLE qa_project_report ADD COLUMN sched_occurrence_id BIGINT REFERENCES sched_occurrence(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX qa_project_report_sched_occurrence_id_key ON qa_project_report (sched_occurrence_id) WHERE sched_occurrence_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS qa_project_report_sched_occurrence_id_key;
ALTER TABLE qa_project_report DROP COLUMN IF EXISTS sched_occurrence_id;
ALTER TABLE sched_set DROP COLUMN IF EXISTS report;
