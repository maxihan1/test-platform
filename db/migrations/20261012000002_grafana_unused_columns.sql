-- 어느 Grafana 패널도 읽지 않는 칸을 대시보드 계정에서 거둔다 — 없앤 「가장 오래된 미확정」이 읽던 넷과 처음부터 안 읽던 tokens_model
-- 본문은 「대시보드 칸 권한」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md · 도메인/리포팅 §8.5 · 진행판 WEB-F3-09)

-- migrate:up

-- 남은 패널은 test_case 를 읽지 않고 service 는 id · name 만 읽는다. 명세는 「패널이 읽는 칸에만 준다」다
REVOKE SELECT (tc_id, is_active) ON test_case FROM grafana_ro;
REVOKE SELECT (prefix, is_active) ON service FROM grafana_ro;
-- 「작성 토큰」 패널은 모델 이름을 낸 적이 없다(2026-09-27 칸과 같이 열었다)
REVOKE SELECT (tokens_model) ON authoring_request FROM grafana_ro;

-- migrate:down

GRANT SELECT (tokens_model) ON authoring_request TO grafana_ro;
GRANT SELECT (prefix, is_active) ON service TO grafana_ro;
GRANT SELECT (tc_id, is_active) ON test_case TO grafana_ro;
