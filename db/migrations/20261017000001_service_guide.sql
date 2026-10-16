-- 서비스 가이드 — 사람이 적은 서비스 소개 · 정책 · 프로젝트 규칙과 첨부 문서 (진행판 PRD-F11-01)
-- 칸은 「서비스 가이드 표」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 첨부 파일 하나. 파일은 디스크(service-guide/<서비스 id>/<id>.<확장자>)에, 사람이 준 이름은 name 에만 둔다.
-- 판에서 빼도 지우지 않는다 — 옛 판 기록이 그 파일을 가리킨다
CREATE TABLE service_guide_file (
  id               BIGSERIAL   PRIMARY KEY,
  service_id       BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  size             BIGINT      NOT NULL CHECK (size >= 0),
  uploaded_by      TEXT        NOT NULL,
  uploaded_by_name TEXT        NOT NULL,   -- 스냅샷. 판 기록에 사람 이름을 적는다
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_guide_file_service ON service_guide_file (service_id);

-- 가이드. 서비스마다 한 벌이고 바꿀 때마다(글 저장 · 파일 더하기 · 빼기) 한 행이다. 고치지 않는다 (prd_version 본보기)
CREATE TABLE service_guide_version (
  service_id    BIGINT      NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL CHECK (version >= 1),
  intro         TEXT        NOT NULL DEFAULT '',     -- 서비스 소개
  policy        TEXT        NOT NULL DEFAULT '',     -- 정책
  rules         TEXT        NOT NULL DEFAULT '',     -- 프로젝트 규칙
  files         JSONB       NOT NULL DEFAULT '[]',   -- [{ id, section }] 올린 차례. id 는 service_guide_file.id — 서버가 그 서비스 것만 넣는다
  saved_by      TEXT        NOT NULL,
  saved_by_name TEXT        NOT NULL,
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, version)
);

-- migrate:down

DROP TABLE IF EXISTS service_guide_version;
DROP TABLE IF EXISTS service_guide_file;
