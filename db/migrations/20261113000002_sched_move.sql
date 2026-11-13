-- 설정의 애플리케이션별 정기 실행을 「<애플리케이션 이름> 전체 회귀」 안정화 기준 세트로 옮기고 옛 service.schedule_* 넷을 지운다 (도메인/정기실행 §3.16 「안정화 기준 세트 · 옮기기」 · SCHED-F1-04)
-- 옛 점검을 끄는 PR 과 같은 때라야 옮긴 뒤 설정에서 고친 값이 사라지거나 그날 두 번 도는 틈이 없다

-- migrate:up

DO $$
DECLARE
  s RECORD;
  이름 TEXT;
  번 INT;
  세트번호 BIGINT;
BEGIN
  FOR s IN SELECT id, project_id, name, kind, is_active, schedule_at, schedule_tz, schedule_env, schedule_last FROM service WHERE schedule_at IS NOT NULL ORDER BY id LOOP
    -- 이름이 겹치면 뒤에 (2) · (3) … 을 붙인다
    이름 := s.name || ' 전체 회귀';
    번 := 1;
    WHILE EXISTS (SELECT 1 FROM sched_set WHERE project_id = s.project_id AND name = 이름) LOOP
      번 := 번 + 1;
      이름 := s.name || ' 전체 회귀 (' || 번 || ')';
    END LOOP;
    -- 비활성 애플리케이션은 꺼 둔 채 옮긴다 — 옛 점검도 돌리지 않았고, 켜 두면 날마다 빈 회차가 달력을 채운다
    INSERT INTO sched_set (project_id, name, at, tz, days, is_on, is_base, created_by)
    -- 마법사에서 이미 기준을 정한 애플리케이션은 기준 세트가 둘이 되지 않게 보통 세트로 옮긴다 (§3.16 「애플리케이션마다 하나」)
    VALUES (s.project_id, 이름, s.schedule_at, s.schedule_tz, '{0,1,2,3,4,5,6}', s.is_active,
            NOT EXISTS (SELECT 1 FROM sched_set b JOIN sched_set_item bi ON bi.set_id = b.id WHERE b.is_base AND bi.service_id = s.id), '스케줄러')
    RETURNING id INTO 세트번호;
    INSERT INTO sched_set_item (set_id, seq, kind, service_id) VALUES (세트번호, 1, 'FN', s.id);
    -- API 애플리케이션에는 UI 테스트가 없다
    IF s.kind <> 'API' THEN
      INSERT INTO sched_set_item (set_id, seq, kind, service_id) VALUES (세트번호, 2, 'UI', s.id);
    END IF;
    -- 대상 서버는 검사하지 않는다 — 실서비스이거나 없는 줄이면 돌 때 빠지고 카드에 보인다
    INSERT INTO sched_set_env (set_id, service_id, env) VALUES (세트번호, s.id, s.schedule_env);
    -- 오늘 이미 돌았으면 오늘 회차를 닫힌 채로 세운다 — 옮긴 날 두 번 돌지 않는다
    IF s.schedule_last IS NOT NULL AND (s.schedule_last AT TIME ZONE s.schedule_tz)::date = (now() AT TIME ZONE s.schedule_tz)::date THEN
      INSERT INTO sched_occurrence (set_id, planned_on, planned_at, state, finished_at, notes)
      VALUES (세트번호, (now() AT TIME ZONE s.schedule_tz)::date, ((now() AT TIME ZONE s.schedule_tz)::date + s.schedule_at) AT TIME ZONE s.schedule_tz,
              'DONE', now(), jsonb_build_array(jsonb_build_object('kind', NULL, 'service', NULL, 'reason', '옮기기 전에 이미 돌았습니다')));
    END IF;
  END LOOP;
END $$;

ALTER TABLE service DROP CONSTRAINT service_schedule_all_or_none;
ALTER TABLE service DROP COLUMN schedule_at, DROP COLUMN schedule_tz, DROP COLUMN schedule_env, DROP COLUMN schedule_last;

-- migrate:down

-- 칸을 되살려 옮긴 기준 세트의 시각 · 시간대 · 대상 서버를 다시 적고 옮긴 세트를 지운다 — 남기면 다시 올릴 때 「(2)」 세트가 하나 더 선다.
-- 회차는 세트와 같이 지워지고 실행의 회차 번호는 빈다. 대상 서버가 실서비스로 바뀌었어도 그대로 적는다(옛 칸은 검사가 없었다)
ALTER TABLE service ADD COLUMN schedule_at TIME, ADD COLUMN schedule_tz TEXT, ADD COLUMN schedule_env TEXT, ADD COLUMN schedule_last TIMESTAMPTZ;
UPDATE service sv SET schedule_at = st.at, schedule_tz = st.tz, schedule_env = e.env
  FROM sched_set st JOIN sched_set_item i ON i.set_id = st.id AND i.seq = 1 JOIN sched_set_env e ON e.set_id = st.id AND e.service_id = i.service_id
 WHERE st.created_by = '스케줄러' AND i.service_id = sv.id;
DELETE FROM sched_set WHERE created_by = '스케줄러';
ALTER TABLE service ADD CONSTRAINT service_schedule_all_or_none
  CHECK ((schedule_at IS NULL) = (schedule_tz IS NULL) AND (schedule_at IS NULL) = (schedule_env IS NULL));
