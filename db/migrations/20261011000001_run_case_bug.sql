-- 실행 결과 실패 카드의 「버그」 판정 표
-- 본문은 「실패 판정 표」 계약 블록 SQL 을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- (실행, 케이스) 한 행. 표준 기획서 · 케이스 · 결과는 안 바뀐다 — 다른 사람도 판정을 보게 남기기만 한다
CREATE TABLE run_case_bug (
  run_id         BIGINT      NOT NULL REFERENCES test_run(run_id),
  tc_id          TEXT        NOT NULL,   -- run_item 의 tc_id 그대로. 외래 키를 걸지 않는다 — run_item 은 (실행, 케이스)가 유일하지 않고 test_case 는 지워질 수 있다
  marked_by      TEXT        NOT NULL,
  marked_by_name TEXT        NOT NULL,   -- 스냅샷. test_run.triggered_by_name 과 같은 까닭이다
  marked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, tc_id)            -- 두 사람이 눌러도 한 줄 — 처음 것이 남는다
);

-- migrate:down

DROP TABLE IF EXISTS run_case_bug;
