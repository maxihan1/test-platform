-- 대상 서버 줄의 역할별 테스트 계정 · 운영 서버 표시 · 계정이 없어 테스트를 못 쓴 요구 (진행판 PRD-F9-01 · 06)
-- 본문은 「역할별 계정 · 운영 서버 · 계정 보류 표」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 운영 서버 줄은 작성 · 화면 탐색이 안 간다(실행은 간다). 실행이 서버 계정을 쓰게 되면 운영 줄에도 계정이 들어가
-- 「운영 줄에는 계정을 넣지 않는다」는 약속만으로는 크롤러를 못 막는다 (도메인/작성 §3.6 「운영 서버 보호」)
ALTER TABLE service_env ADD COLUMN is_prod BOOLEAN NOT NULL DEFAULT false;
-- 이름이 운영인 줄은 켠 채로 시작한다 — 잘못 켜지면 작성이 BAD_ENV 로 멈출 뿐이고, 잘못 꺼지면 크롤러가 운영 데이터를 바꾼다
UPDATE service_env SET is_prod = true WHERE lower(env) IN ('prod', 'production') OR env = '운영';

-- 일반 회원(login_id · login_password) 밖의 역할 계정 [{ "role", "loginId", "loginPassword" }].
-- 비밀번호는 원문이다 — login_password 와 같은 까닭(에이전트 · 실행이 그 값을 쳐서 로그인한다). service_env 는 grafana_ro 에 주지 않았다
ALTER TABLE service_env ADD COLUMN role_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE service_env ADD CONSTRAINT service_env_role_accounts_check CHECK (jsonb_typeof(role_accounts) = 'array');

-- 계정이 없어 테스트를 못 쓴 요구. 사본 — 스캔마다 그 서비스 몫을 지우고 요구사항 표에서 다시 채운다(지도 ① req_case 와 같다)
CREATE TABLE req_hold (
  service_id BIGINT NOT NULL REFERENCES service(id),
  req_id     TEXT   NOT NULL,
  role       TEXT   NOT NULL,
  PRIMARY KEY (service_id, req_id, role)
);

-- migrate:down

DROP TABLE IF EXISTS req_hold;
ALTER TABLE service_env DROP CONSTRAINT IF EXISTS service_env_role_accounts_check;
ALTER TABLE service_env DROP COLUMN IF EXISTS role_accounts;
ALTER TABLE service_env DROP COLUMN IF EXISTS is_prod;
