-- 대시보드 계정의 run_item 표 단위 읽기를 「평균 소요시간」 패널이 읽는 두 칸으로 줄인다 — params · expected 에 대상 서버 비밀번호 원문이 박제된다 (docs/spec/공통/4-데이터모델.md 「대시보드 칸 권한」 · 진행판 FIX-F1-04 · 리뷰 H4)

-- migrate:up

-- 표 단위 REVOKE 는 칸 권한도 같이 거두므로 거둔 뒤에 칸을 준다.
-- Grafana Viewer 는 SQL 을 직접 보내 패널 모양과 상관없이 연 칸 전부를 읽는다(도메인/인증 §3.5) — error 의 되비친 값도 막으려고 두 칸만 연다
REVOKE SELECT ON run_item FROM grafana_ro;
GRANT SELECT (run_id, duration_ms) ON run_item TO grafana_ro;

-- migrate:down

REVOKE SELECT (run_id, duration_ms) ON run_item FROM grafana_ro;
GRANT SELECT ON run_item TO grafana_ro;
