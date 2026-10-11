-- 찾은 화면 표 — 크롤러가 찾은 화면 목록 (PRD-F6-03)
-- 본문은 「찾은 화면」 계약 블록 SQL 을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md).

-- migrate:up

-- 찾은 화면. 크롤러가 찾은 화면 목록 — 「PRD 관리」의 「PRD 에 없는 화면」을 센다(2026-10-11 PRD-F6-03 · 도메인/작성 §3.6 「화면 기록과 크롤러」).
-- 화면 기록과 따로 두는 까닭 — 대조는 AI 가 기획서 화면만 기록해 screen_record 로는 나머지 화면을 모른다. 화면 기록 done 이 쓰고 같은 규칙으로 지운다
CREATE TABLE screen_found (
  service_id BIGINT NOT NULL REFERENCES service(id),
  state      TEXT   NOT NULL CHECK (state IN ('로그아웃','로그인')),
  url        TEXT   NOT NULL,   -- screen_record.url 과 같은 같은 틀
  name       TEXT   NOT NULL,   -- 크롤 목록의 화면 이름(빈 글자 됨)
  PRIMARY KEY (service_id, state, url)
);

-- migrate:down

DROP TABLE IF EXISTS screen_found;
