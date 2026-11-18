-- 지도 ① 이 게임 시나리오 표 줄(축 「미션」)을 받게 축 제약에 다섯째 값을 더한다 (docs/spec/공통/4-데이터모델.md req_case · 도메인/게임 §3.10 「작성 — 한 바퀴」 ④ · GAME-F3-05)

-- migrate:up

ALTER TABLE req_case DROP CONSTRAINT req_case_axis_check;
ALTER TABLE req_case ADD CONSTRAINT req_case_axis_check CHECK (axis IN ('정상','경계','예외','UI','미션'));

-- migrate:down

DELETE FROM req_case WHERE axis = '미션';
ALTER TABLE req_case DROP CONSTRAINT req_case_axis_check;
ALTER TABLE req_case ADD CONSTRAINT req_case_axis_check CHECK (axis IN ('정상','경계','예외','UI'));
