-- 서비스마다 정기 실행 시각 · 시간대 · 대상 서버와 마지막으로 돈 때를 담는다
-- 본문은 「정기 실행」 계약 블록을 그대로 옮긴 것이다 (docs/spec/도메인/인증.md §7 · 공통/4-데이터모델.md service · 진행판 WEB-F3-08)

-- migrate:up

ALTER TABLE service
  ADD COLUMN schedule_at   TIME,
  ADD COLUMN schedule_tz   TEXT,
  ADD COLUMN schedule_env  TEXT,
  ADD COLUMN schedule_last TIMESTAMPTZ,
  -- 반쯤 찬 줄은 점검이 시각은 알고 대상 서버를 모르는 채로 돌게 된다
  ADD CONSTRAINT service_schedule_all_or_none
    CHECK ((schedule_at IS NULL) = (schedule_tz IS NULL) AND (schedule_at IS NULL) = (schedule_env IS NULL));

-- migrate:down

ALTER TABLE service
  DROP CONSTRAINT service_schedule_all_or_none,
  DROP COLUMN schedule_at,
  DROP COLUMN schedule_tz,
  DROP COLUMN schedule_env,
  DROP COLUMN schedule_last;
