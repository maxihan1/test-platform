-- 케이스마다 한 벌 저장하는 실행 입력값 — 요청에 없는 칸을 createRun 이 이 값으로 채운다
-- 본문은 게이트 0 승인 계약 그대로다 (docs/spec/공통/4-데이터모델.md §6 case_input)

-- migrate:up

-- 이름 없이 케이스당 한 행이다. 묶음(param_set)과 달리 고르지 않아도 실행에 쓰이므로 이름 약속이 필요 없다
CREATE TABLE case_input (
  tc_id     TEXT        PRIMARY KEY REFERENCES test_case(tc_id),
  params    JSONB       NOT NULL,
  expected  JSONB       NOT NULL,
  saved_by  TEXT        NOT NULL,
  saved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE IF EXISTS case_input;
