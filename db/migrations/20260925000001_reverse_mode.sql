-- SPEC 역방향(모드 B) 칸. 미확정 꼬리표·대상 서버 테스트 계정·작성 요청의 대조·에이전트 산출물 역할
-- 본문은 「역방향 칸」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 비면 확정 케이스다. 카탈로그는 캐시라 스캐너가 코드에서 읽어 채운다
ALTER TABLE test_case ADD COLUMN unconfirmed TEXT;
-- 처음 미확정으로 본 때. 사유 글자가 바뀌어도 유지하고 풀리면 NULL. 「가장 오래된 미확정의 나이」의 근거다
ALTER TABLE test_case ADD COLUMN unconfirmed_since TIMESTAMPTZ;

-- 실행을 만들 때 박제한다. 케이스가 나중에 확정돼도 그날의 집계·증적은 미확정 묶음을 그대로 가져야 한다
-- grafana_ro 는 run_item 에 표 단위 SELECT 가 있어 이 칸도 따라간다
ALTER TABLE run_item ADD COLUMN unconfirmed TEXT;

-- 대상 서버 줄마다 테스트 계정. 작성 에이전트가 브라우저로 쳐서 로그인해야 하므로 해시가 아니라 원문이다.
-- login_password 는 비밀값이라 화면에 되돌려 보여주지 않는다. service_env 는 grafana_ro 에 주지 않았다
ALTER TABLE service_env ADD COLUMN login_id TEXT;
ALTER TABLE service_env ADD COLUMN login_password TEXT;

-- 대조를 켰는가 · 어느 대상 서버를 훑는가 · 어디서 훑기 시작하는가
ALTER TABLE authoring_request ADD COLUMN compare BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE authoring_request ADD COLUMN env TEXT;
ALTER TABLE authoring_request ADD COLUMN start_url TEXT;
-- 대조 없이 서버·주소만 남거나, 서버 없이 대조가 켜지면 에이전트가 무엇을 훑을지 모른다.
-- 재실행은 원본 요청을, 머지는 PR 을 다룰 뿐이라 대조는 작성 요청에만 붙는다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind = 'AUTHOR'
              ELSE env IS NULL AND start_url IS NULL END);

-- 사람이 넣은 입력인지, 작성 에이전트가 내놓은 표시 사본·역기획서인지. 옛 행은 전부 사람 입력이다
ALTER TABLE authoring_asset ADD COLUMN role TEXT NOT NULL DEFAULT 'INPUT';
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_role_check
  CHECK (role IN ('INPUT', 'MARKED', 'REVERSE_SPEC'));
-- MARKED 가 어느 원본의 사본인지 가리킨다
ALTER TABLE authoring_asset ADD COLUMN source_asset_id BIGINT REFERENCES authoring_asset(id);

-- migrate:down

-- 역할 칸이 사라지면 에이전트 산출물이 사람 입력처럼 남는다. 먼저 버린다
DELETE FROM authoring_asset WHERE role <> 'INPUT';
ALTER TABLE authoring_asset DROP COLUMN IF EXISTS source_asset_id;
ALTER TABLE authoring_asset DROP CONSTRAINT IF EXISTS authoring_asset_role_check;
ALTER TABLE authoring_asset DROP COLUMN IF EXISTS role;

ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_compare_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS start_url;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS env;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS compare;

ALTER TABLE service_env DROP COLUMN IF EXISTS login_password;
ALTER TABLE service_env DROP COLUMN IF EXISTS login_id;

ALTER TABLE run_item DROP COLUMN IF EXISTS unconfirmed;

ALTER TABLE test_case DROP COLUMN IF EXISTS unconfirmed_since;
ALTER TABLE test_case DROP COLUMN IF EXISTS unconfirmed;
