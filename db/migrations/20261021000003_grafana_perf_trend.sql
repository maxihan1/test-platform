-- 「성능 테스트 추세」 패널이 읽는 perf_run 숫자 칸만 대시보드 계정에 연다 — 판정 · config · ai · targets 는 주지 않는다 (docs/spec/공통/4-데이터모델.md · 진행판 PERF-F1-06)

-- migrate:up

GRANT SELECT (status, finished_at, peak_vus, max_tps, p95_ms, error_rate) ON perf_run TO grafana_ro;

-- migrate:down

REVOKE SELECT (status, finished_at, peak_vus, max_tps, p95_ms, error_rate) ON perf_run FROM grafana_ro;
