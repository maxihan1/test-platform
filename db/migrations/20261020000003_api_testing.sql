-- API 테스트 칸과 표 — 애플리케이션 종류 · API 문서 판 · API 인증 · API × 응답 코드 (docs/spec/공통/4-데이터모델.md 「API 테스트 표」 · API-F1-03)

-- migrate:up

-- 만들 때 정하고 바꾸지 않는다(도메인/API §3.8 「꼬리표와 다르다」). 지금 있던 행은 전부 화면 애플리케이션이다
ALTER TABLE service ADD COLUMN kind TEXT NOT NULL DEFAULT 'SCREEN' CHECK (kind IN ('SCREEN', 'API'));
-- 문서 주소 = 대상 서버 주소 + 이 경로. api_doc_env 는 service_env.env 키다 — 외래키는 안 건다(schedule_env 와 같은 까닭: 대상 서버 줄을 지우고 다시 넣는다)
ALTER TABLE service ADD COLUMN api_doc_path TEXT CHECK (api_doc_path IS NULL OR (api_doc_path LIKE '/%' AND length(api_doc_path) <= 500));
ALTER TABLE service ADD COLUMN api_doc_env  TEXT;
ALTER TABLE service ADD CONSTRAINT service_api_doc_kind CHECK (kind = 'API' OR (api_doc_path IS NULL AND api_doc_env IS NULL));

-- 대상 서버 줄마다 API 인증 [{ name, tokenUrl, clientId, clientSecret }]. 비밀값은 원문이라 응답에는 끝 4자리만 싣는다
ALTER TABLE service_env ADD COLUMN api_auths JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(api_auths) = 'array');

-- 판은 마지막 판과 지문이 다를 때만 한 행 오른다. 지우지 않는다 — 케이스가 만들어진 판을 실행 때 읽는다
CREATE TABLE api_doc_version (
  id          BIGSERIAL   PRIMARY KEY,
  service_id  BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL CHECK (version >= 1),
  fingerprint TEXT        NOT NULL,
  doc         JSONB       NOT NULL,
  source      TEXT        NOT NULL CHECK (source IN ('URL', 'FILE')),
  env         TEXT,
  file_name   TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((source = 'URL') = (env IS NOT NULL)),
  UNIQUE (service_id, version)
);

ALTER TABLE test_case ADD COLUMN api_doc INTEGER CHECK (api_doc IS NULL OR api_doc >= 1);

ALTER TABLE test_run ADD COLUMN api_doc_version INTEGER;
ALTER TABLE test_run ADD COLUMN api_doc_note    TEXT CHECK (api_doc_note IS NULL OR api_doc_note IN ('DIFFERS', 'FETCH_FAILED'));

-- 사본 — 실행 저장이 채우고 커버리지 · 「이 API 를 부르는 케이스」가 읽는다. run_id 는 실행을 지워도 남게 외래키를 안 건다
CREATE TABLE api_call_seen (
  service_id BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  tc_id      TEXT        NOT NULL,
  method     TEXT        NOT NULL,
  path       TEXT        NOT NULL,
  status     INTEGER     NOT NULL CHECK (status BETWEEN 100 AND 599),
  no_shape   BOOLEAN     NOT NULL DEFAULT false,
  run_id     BIGINT      NOT NULL,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, tc_id, method, path, status)
);

-- 작성 자료에 API 문서 판을 더한다. 이름 없이 걸었던 CHECK 둘(20260923000001)을 지우고 셋으로 다시 건다
ALTER TABLE authoring_asset ADD COLUMN api_doc_version_id BIGINT REFERENCES api_doc_version(id) ON DELETE CASCADE;
ALTER TABLE authoring_asset DROP CONSTRAINT authoring_asset_kind_check;
ALTER TABLE authoring_asset DROP CONSTRAINT authoring_asset_check;
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_kind_check CHECK (kind IN ('FILE', 'FIGMA', 'API_DOC'));
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_figma_check CHECK ((kind = 'FIGMA') = (figma_url IS NOT NULL));
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_api_doc_check CHECK ((kind = 'API_DOC') = (api_doc_version_id IS NOT NULL));

-- API 애플리케이션 작성은 compare 없이 env 를 갖는다. 정방향 화면 작성이 env 를 안 받는 규칙은 서버(BAD_ENV)가 지킨다 — DB 는 애플리케이션 종류를 모른다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind IN ('AUTHOR', 'RERUN')
              ELSE start_url IS NULL END);

-- grafana_ro 에 아무것도 주지 않는다 — 어느 패널도 안 읽는다(service_env 의 비밀값도 있다)

-- migrate:down

ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
UPDATE authoring_request SET env = NULL WHERE NOT compare AND kind <> 'MERGE';
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind IN ('AUTHOR', 'RERUN')
              WHEN kind = 'MERGE' THEN start_url IS NULL
              ELSE env IS NULL AND start_url IS NULL END);

DELETE FROM authoring_asset WHERE kind = 'API_DOC';
ALTER TABLE authoring_asset DROP CONSTRAINT authoring_asset_api_doc_check;
ALTER TABLE authoring_asset DROP CONSTRAINT authoring_asset_figma_check;
ALTER TABLE authoring_asset DROP CONSTRAINT authoring_asset_kind_check;
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_kind_check CHECK (kind IN ('FILE', 'FIGMA'));
ALTER TABLE authoring_asset ADD CONSTRAINT authoring_asset_check CHECK ((kind = 'FILE') = (figma_url IS NULL));
ALTER TABLE authoring_asset DROP COLUMN api_doc_version_id;

DROP TABLE IF EXISTS api_call_seen;
ALTER TABLE test_run DROP COLUMN IF EXISTS api_doc_note;
ALTER TABLE test_run DROP COLUMN IF EXISTS api_doc_version;
ALTER TABLE test_case DROP COLUMN IF EXISTS api_doc;
DROP TABLE IF EXISTS api_doc_version;
ALTER TABLE service_env DROP COLUMN IF EXISTS api_auths;
ALTER TABLE service DROP CONSTRAINT IF EXISTS service_api_doc_kind;
ALTER TABLE service DROP COLUMN IF EXISTS api_doc_env;
ALTER TABLE service DROP COLUMN IF EXISTS api_doc_path;
ALTER TABLE service DROP COLUMN IF EXISTS kind;
