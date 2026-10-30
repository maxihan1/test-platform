-- 한 건 실행(SINGLE)과 그 한 건이 붙은 실행 (공통/4-데이터모델 「실행 시작 방식」 · 도메인/실행 §3.2 「★ 한 건 실행은 묶음 실행에 붙는다」)

-- migrate:up

ALTER TABLE test_run DROP CONSTRAINT test_run_origin_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_origin_check CHECK (origin IN ('MANUAL','SCHEDULED','RERUN','BUILD','SINGLE'));
-- SINGLE 은 붙일 곳이 없으면 비어 있는 것이 정상이다 — 「SINGLE 이면 반드시 찬다」는 걸지 않는다
ALTER TABLE test_run DROP CONSTRAINT test_run_rerun_of_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_rerun_of_check CHECK (rerun_of IS NULL OR origin IN ('RERUN','SINGLE'));
-- 실행마다 붙은 한 건을 찾는다 — 지금 결과를 셀 때마다 탄다
CREATE INDEX test_run_single_of ON test_run (rerun_of) WHERE origin = 'SINGLE';

-- migrate:down

DROP INDEX IF EXISTS test_run_single_of;
UPDATE test_run SET origin = 'MANUAL', rerun_of = NULL WHERE origin = 'SINGLE';
ALTER TABLE test_run DROP CONSTRAINT test_run_rerun_of_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_rerun_of_check CHECK (rerun_of IS NULL OR origin = 'RERUN');
ALTER TABLE test_run DROP CONSTRAINT test_run_origin_check;
ALTER TABLE test_run ADD CONSTRAINT test_run_origin_check CHECK (origin IN ('MANUAL','SCHEDULED','RERUN','BUILD'));
