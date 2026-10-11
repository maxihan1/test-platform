-- 케이스 표의 미확정 칸 둘을 뺀다. 미확정은 표준 기획서 지금 판과 지도 ① 에서 계산한다
-- 본문은 「미확정 칸 빼기」 계약 블록 SQL 을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md · 진행판 PRD-F4-05)

-- migrate:up

-- 「가장 오래된 미확정」 패널이 읽던 칸이다. 칸을 지우면 권한도 같이 사라지지만 회수를 글로 남긴다
REVOKE SELECT (unconfirmed_since) ON test_case FROM grafana_ro;
-- run_item · scenario_run_part 의 박제 칸은 남는다 — 그날 확정이 아니었다는 사실은 남아야 한다
ALTER TABLE test_case DROP COLUMN unconfirmed, DROP COLUMN unconfirmed_since;

-- migrate:down

-- 값은 못 되살린다. 다음 스캔도 채우지 않는다 — 꼬리표를 읽던 코드가 없어졌다
ALTER TABLE test_case ADD COLUMN unconfirmed TEXT, ADD COLUMN unconfirmed_since TIMESTAMPTZ;
GRANT SELECT (unconfirmed_since) ON test_case TO grafana_ro;
