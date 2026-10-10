-- 표준 기획서 · 지도 · 화면 기록 표와 작성 요청의 읽은 판 칸
-- 본문은 「표준 기획서 · 지도 · 화면 기록 표」 계약 블록 첫 SQL 을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md).
-- 미확정 칸 빼기(둘째 SQL)는 꼬리표가 남은 케이스가 0 이 된 뒤 PRD-F4-02 가 따로 한다

-- migrate:up

-- 표준 기획서. 서비스마다 한 벌이고 저장할 때마다 한 행이다. 고치지 않는다 — 되돌리기도 새 행이다 (scenario_version 본보기)
CREATE TABLE prd_version (
  service_id    BIGINT      NOT NULL REFERENCES service(id),
  version       INTEGER     NOT NULL CHECK (version >= 1),
  items         JSONB       NOT NULL,   -- PrdItem[] (공통/3-공유계약 「표준 기획서 타입」). 번호 차례
  last_no       INTEGER     NOT NULL,   -- 지금까지 준 가장 큰 번호. 판마다 물려받는다 — 지운 번호를 다시 안 주려고
  source        TEXT        NOT NULL CHECK (source IN ('AGENT','PERSON','REVERT')),   -- 옮기기 · 사람 · 되돌리기
  request_id    BIGINT      REFERENCES authoring_request(id),   -- 옮기기가 만든 판만. 어느 작성 실행이 옮겼나
  saved_by      TEXT        NOT NULL,
  saved_by_name TEXT        NOT NULL,   -- 스냅샷. 판 이력에 사람 이름을 적는다
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, version),
  CHECK ((source = 'AGENT') = (request_id IS NOT NULL))
);

-- 작성 실행이 읽은 판. 집을 때 서버가 지금 판을 적고 옮기기가 새 판을 올리면 바꾼다(EDIT · MERGE 는 비운다).
-- 「반영 안 됨」은 마지막으로 병합된 뿌리의 마지막 작성 실행의 이 값과 지금 판을 견준다 (도메인/작성 §3.6 「사람이 고칠 때」)
ALTER TABLE authoring_request
  ADD COLUMN prd_version INTEGER,
  ADD CONSTRAINT authoring_request_prd_version_fkey
    FOREIGN KEY (service_id, prd_version) REFERENCES prd_version(service_id, version);

-- 지도 ① 요구 ↔ 케이스 (다대다). 사본 — 스캔마다 그 서비스 몫을 지우고 요구사항 표 출처 칸에서 다시 채운다
CREATE TABLE req_case (
  service_id BIGINT NOT NULL REFERENCES service(id),
  req_id     TEXT   NOT NULL,   -- 출처 칸의 번호 그대로. 표준 기획서에 없는 번호도 넣는다 — 화면이 「PRD 에 없음」으로 보인다
  tc_id      TEXT   NOT NULL,   -- 외래 키를 걸지 않는다 — 표에는 아직 카탈로그에 없는 번호(병합 전 · 오타)가 있을 수 있고, 걸면 그 한 줄로 서비스 스캔 전체가 실패한다. 읽을 때 활성 케이스와만 잇는다
  axis       TEXT   NOT NULL CHECK (axis IN ('정상','경계','예외','UI')),   -- 그 줄의 축 칸 그대로(도메인/작성 §3.6 「칸과 번호」)
  PRIMARY KEY (req_id, tc_id, axis)
);

-- 지도 ② 케이스 ↔ 화면 파일 ↔ 화면 주소. 사본 — 케이스 파일이 부르는 Page Object · 화면 조각과 화면 파일의 화면 주소 값에서
CREATE TABLE case_screen (
  tc_id      TEXT NOT NULL REFERENCES test_case(tc_id),   -- 스캐너가 케이스 파일에서 읽으므로 늘 카탈로그에 있다
  file       TEXT NOT NULL,   -- tests/<폴더>/pages/<이름>.page.ts(화면) 또는 components/<이름>.component.ts(화면 조각). helpers/ 는 안 넣는다
  screen_url TEXT,            -- 화면 파일의 화면 주소 값(경로). 화면 조각 · 값이 없는 파일이면 NULL
  PRIMARY KEY (tc_id, file)
);

-- 화면 기록. 작성 서버 디스크 저장본(작업 바탕 screens/<접두사>/)을 옮긴다 — 재사용 규칙은 도메인/작성 §3.6 「바뀐 화면만 다시 훑는다」 그대로
CREATE TABLE screen_record (
  service_id BIGINT      NOT NULL REFERENCES service(id),
  state      TEXT        NOT NULL CHECK (state IN ('로그아웃','로그인')),
  url        TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  text_fp    TEXT        NOT NULL,   -- 글자 지문
  struct_fp  TEXT        NOT NULL,   -- 구조 지문
  record     TEXT        NOT NULL,   -- 화면 기록(md). 로그인 화면의 이름 · 이메일이 들 수 있다 — 에이전트 통로만 읽는다. 사람에게는 주소 · 이름만
  crawled_at TIMESTAMPTZ NOT NULL,   -- 훑은 날. 재사용해도 안 바꾼다(30일 그물)
  PRIMARY KEY (service_id, state, url)
);

-- 화면 연결. 어느 화면에서 무엇을 눌러 어느 화면으로 갔나 — E2E 다음 단계 추천의 재료 (도메인/시나리오 §3.7)
CREATE TABLE screen_link (
  service_id BIGINT NOT NULL REFERENCES service(id),
  state      TEXT   NOT NULL CHECK (state IN ('로그아웃','로그인')),
  from_url   TEXT   NOT NULL,
  to_url     TEXT   NOT NULL,
  via        TEXT   NOT NULL,   -- 누른 것의 이름(링크 글자 · 버튼 이름)
  PRIMARY KEY (service_id, state, from_url, to_url, via)
);

-- migrate:down

DROP TABLE IF EXISTS screen_link;
DROP TABLE IF EXISTS screen_record;
DROP TABLE IF EXISTS case_screen;
DROP TABLE IF EXISTS req_case;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_prd_version_fkey;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS prd_version;
DROP TABLE IF EXISTS prd_version;
