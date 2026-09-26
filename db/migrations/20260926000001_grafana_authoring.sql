-- Grafana 「작성 현황」 패널이 읽는 칸에만 대시보드 계정 권한을 준다 (docs/spec/공통/4-데이터모델.md 「대시보드 칸 권한」)

-- migrate:up

-- 표 단위로 주면 기획서 본문(spec_text)·테스트 소스·슬랙 주소·피그마 토큰이 대시보드로 샌다. 칸 목록 정본은 명세 표다
GRANT SELECT (tc_id, is_active, unconfirmed_since) ON test_case TO grafana_ro;
GRANT SELECT (id, prefix, name, is_active) ON service TO grafana_ro;
GRANT SELECT (id, service_id, kind, status, compare, created_at, started_at, finished_at) ON authoring_request TO grafana_ro;

-- migrate:down

REVOKE SELECT (id, service_id, kind, status, compare, created_at, started_at, finished_at) ON authoring_request FROM grafana_ro;
REVOKE SELECT (id, prefix, name, is_active) ON service FROM grafana_ro;
REVOKE SELECT (tc_id, is_active, unconfirmed_since) ON test_case FROM grafana_ro;
