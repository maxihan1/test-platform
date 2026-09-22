-- SPEC §6 작성 대기줄. 화면이 행을 넣고 맥에서 도는 작성 에이전트가 집어 간다.
-- 본문은 §6의 SQL 예시를 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

CREATE TABLE authoring_request (
  id                BIGSERIAL PRIMARY KEY,
  service_id        BIGINT      NOT NULL REFERENCES service(id),   -- 한 요청은 한 서비스다. 접두사도 테스트 저장소도 여기서 나온다
  kind              TEXT        NOT NULL,   -- AUTHOR | RERUN | MERGE. 셋이 한 줄에 선다 — 집어 가는 쪽이 맥 하나라 줄도 하나다
  source_id         BIGINT      REFERENCES authoring_request(id),  -- RERUN·MERGE 가 무엇에 대한 것인가. AUTHOR 는 비운다
  spec_text         TEXT        NOT NULL,   -- 스냅샷. 기획서 본문 그대로. 경로만 두면 맥이 그 파일을 못 읽는다
  params            JSONB       NOT NULL DEFAULT '{}',   -- RERUN 이 바꿔 보낸 값. 무엇을 바꿀 수 있는지는 아직 안 정했다
  requested_by      TEXT        NOT NULL,   -- 누가 눌렀나 (§7 Auth). app_user를 가리키지만 FK는 걸지 않는다
  requested_by_name TEXT        NOT NULL,   -- 스냅샷. 누를 당시의 사람 이름. test_run.triggered_by_name 과 같은 이유다
  claimed_by        TEXT,                   -- 집어 간 계정. app_user를 가리키지만 FK는 걸지 않는다 (requested_by와 같은 이유)
  status            TEXT        NOT NULL,   -- PENDING | RUNNING | DONE | FAILED
  stage             TEXT,                   -- 위층 진행 한 줄. 「케이스 2건째」·「관문 3 도는 중」. 아래층은 여기 안 들어온다
  stage_at          TIMESTAMPTZ,            -- 그 한 줄이 마지막으로 바뀐 시각. 「도는 중」과 「거기서 맥이 죽었다」를 가른다
  result            JSONB,                  -- 맥이 올린 판정. 러너와 같은 리포터를 타므로 §5.1 의 모양 그대로다
  test_source       JSONB,                  -- 스냅샷. 파일 경로 → 소스 본문. 머지 전 파일은 admin의 /tests 에 없다
  screenshot_dir    TEXT,                   -- 이 요청의 사진이 들어간 폴더. 대기줄 행 번호로 가른다 (2026-09-22 결정)
  pr_url            TEXT,                   -- 맥이 연 초안 PR. MERGE 요청은 이것을 보고 친다
  error             TEXT,                   -- FAILED일 때 사람이 읽을 한 문장. 원문 오류를 그대로 쓰지 않는다
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,            -- 맥이 집어 간 시각
  finished_at       TIMESTAMPTZ,
  -- 가리키는 것 없이 RERUN·MERGE 가 들어오거나, AUTHOR가 남의 행을 가리키는 것을 막는다
  CHECK ((kind = 'AUTHOR') = (source_id IS NULL)),
  -- 값 자체를 가둔다. 위 CHECK 는 짝만 보므로 {kind:'MERGE', source_id:42} 를 그냥 통과시킨다 —
  -- 오타난 kind 가 대기줄에 서면 맥이 「모르는 일」을 집는다 (2026-09-22 검토가 잡았다)
  CHECK (kind IN ('AUTHOR', 'RERUN', 'MERGE')),
  -- 상태도 값 자체를 가둔다. 모르는 상태가 들어오면 집기도 화면 거르기도 그 행을 조용히 빠뜨린다
  CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED'))
);

-- 집기가 「그 서비스의 가장 오래된 대기 중」 한 건을 찾는 길. 줄이 길어져도 훑지 않는다
CREATE INDEX authoring_request_queue_idx ON authoring_request (service_id, status, id);

-- grafana_ro 에 아무것도 주지 않는다. 2026-09-17 에 기본 허용을 껐으므로 새 표는 자동으로 안 붙는다.
-- 대시보드가 이 표를 읽을 일이 생기면 그때 GRANT 한 줄을 더한다 (SPEC §6)

-- migrate:down

DROP TABLE IF EXISTS authoring_request;
