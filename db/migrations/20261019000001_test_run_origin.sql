-- 실행 시작 방식(직접 · 정기 · 실패 다시)과 다시 돌린 원래 실행 (공통/4-데이터모델 「실행 시작 방식」)
-- 칸은 test_run 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

ALTER TABLE test_run
  ADD COLUMN origin   TEXT   NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN rerun_of BIGINT REFERENCES test_run(run_id) ON DELETE SET NULL;
-- 정해진 시간 실행은 실행자를 「스케줄러」로 박제해 왔다. 옛 「실패 다시」는 가를 재료가 없어 MANUAL 로 남긴다 — 지어내지 않는다
UPDATE test_run SET origin = 'SCHEDULED' WHERE triggered_by = '스케줄러';
ALTER TABLE test_run ADD CONSTRAINT test_run_origin_check CHECK (origin IN ('MANUAL','SCHEDULED','RERUN'));
-- 「RERUN 이면 반드시 찬다」는 걸지 않는다 — 원래 실행이 지워지면 NULL 로 돌아가야 해서 서버가 만들 때 지킨다
ALTER TABLE test_run ADD CONSTRAINT test_run_rerun_of_check CHECK (rerun_of IS NULL OR origin = 'RERUN');

-- migrate:down

ALTER TABLE test_run DROP CONSTRAINT IF EXISTS test_run_rerun_of_check;
ALTER TABLE test_run DROP CONSTRAINT IF EXISTS test_run_origin_check;
ALTER TABLE test_run DROP COLUMN IF EXISTS rerun_of;
ALTER TABLE test_run DROP COLUMN IF EXISTS origin;
