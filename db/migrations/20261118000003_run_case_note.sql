-- 게임 시나리오의 「설명 안 되는 줄」(verify.note) 판정 표
-- 본문은 공통/4-데이터모델 「설명 안 되는 줄 판정 표」 SQL 을 그대로 옮긴 것이다 (GAME-F3-06)

-- migrate:up

-- (실행, 케이스) 한 행. run_case_bug 와 따로 둔다 — 통과한 항목을 버그 표에 넣으면 리포트의 실패 셈이 틀어진다
CREATE TABLE run_case_note (
  run_id         BIGINT      NOT NULL REFERENCES test_run(run_id),
  tc_id          TEXT        NOT NULL,   -- run_item 의 tc_id 그대로. 외래 키를 걸지 않는 까닭은 run_case_bug 와 같다
  verdict        TEXT        NOT NULL CHECK (verdict IN ('BUG', 'RULE')),   -- 이슈 등록 · PRD 수정
  marked_by      TEXT        NOT NULL,
  marked_by_name TEXT        NOT NULL,   -- 스냅샷
  marked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, tc_id)            -- 두 사람이 눌러도 한 줄 — 처음 것이 남는다
);

-- migrate:down

DROP TABLE IF EXISTS run_case_note;
