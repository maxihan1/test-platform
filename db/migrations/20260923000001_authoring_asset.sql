-- SPEC §6 작성 자료. 기획서 파일·피그마 주소를 요청에 딸린 자료 행으로 받고, 올리는 동안은 DRAFT 로 줄 밖에 둔다
-- 본문은 §6의 SQL 예시를 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 기획서는 자료로 온다. 옛 행만 이 칸이 찬다
ALTER TABLE authoring_request ALTER COLUMN spec_text DROP NOT NULL;

-- 옛 CHECK 는 이름 없이 만들어져 자동 이름이다. 되돌릴 때 같은 이름을 찾도록 이번엔 이름을 붙인다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_status_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_status_check
  CHECK (status IN ('DRAFT', 'PENDING', 'RUNNING', 'DONE', 'FAILED'));

CREATE TABLE authoring_asset (
  id         BIGSERIAL PRIMARY KEY,
  request_id BIGINT      NOT NULL REFERENCES authoring_request(id) ON DELETE CASCADE,
  position   INTEGER     NOT NULL,   -- 넣은 순서. 맥이 이 순서대로 읽는다
  kind       TEXT        NOT NULL,   -- FILE | FIGMA
  name       TEXT        NOT NULL,   -- 화면에 보일 이름. FILE 은 사람이 준 파일 이름, FIGMA 는 figma_url 과 같다. 디스크 이름으로 쓰지 않는다
  figma_url  TEXT,                   -- FIGMA 만 찬다. 사람이 준 주소를 정규화해 다시 조립한 것 (도메인/작성 §7)
  size       BIGINT,                 -- FILE 만 찬다. 바이트
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind IN ('FILE', 'FIGMA')),
  -- 파일인데 주소가 있거나 피그마인데 주소가 없으면 맥이 무엇을 읽을지 모른다
  CHECK ((kind = 'FILE') = (figma_url IS NULL)),
  -- 동시에 두 번 올려도 순서 번호가 겹치지 않게 DB 가 막는다
  UNIQUE (request_id, position)
);

-- 작성 에이전트가 피그마 자료를 읽을 열쇠. slack_webhook 과 같은 비밀값 규칙이다 (도메인/인증 §8.8)
ALTER TABLE service ADD COLUMN figma_token TEXT;

-- grafana_ro 에 아무것도 주지 않는다 (20260922000001 과 같은 이유)

-- migrate:down

ALTER TABLE service DROP COLUMN IF EXISTS figma_token;
DROP TABLE IF EXISTS authoring_asset;

-- 옛 표는 DRAFT 도 빈 본문도 모른다. 줄에 안 선 DRAFT 는 버리고, 빈 본문은 자리표시 글로 채워야
-- 아래 두 제약이 걸린다. 자리표시가 남은 행은 되돌린 뒤 맥이 읽어도 「원본이 없다」로 드러난다
DELETE FROM authoring_request WHERE status = 'DRAFT';
UPDATE authoring_request SET spec_text = '(자료로 받은 요청 — 되돌리며 본문이 사라졌다)'
 WHERE spec_text IS NULL;
ALTER TABLE authoring_request ALTER COLUMN spec_text SET NOT NULL;

ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_status_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_status_check
  CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED'));
