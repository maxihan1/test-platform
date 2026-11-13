// 안정화 DB 검사가 쓰는 안정화 기준 세트 차림 — 옛 정기 실행의 하루는 기준 세트 시간대로 묶는다 (aggregate.ts 묶음SQL)

import type { Pool } from 'pg';

/** 그 애플리케이션의 프로젝트에 매일 03:00 기준 세트를 세운다 */
export async function 기준세트세우기(pool: Pool, serviceId: number, tz = 'Asia/Seoul'): Promise<void> {
  await pool.query(
    `WITH st AS (INSERT INTO sched_set (project_id, name, at, tz, days, is_base, created_by)
                 SELECT project_id, name || ' 전체 회귀', '03:00', $2, '{0,1,2,3,4,5,6}', true, '스케줄러' FROM service WHERE id = $1 RETURNING id)
     INSERT INTO sched_set_item (set_id, seq, kind, service_id) SELECT id, 1, 'FN', $1 FROM st`,
    [serviceId, tz],
  );
}

/** 담은 줄이 애플리케이션을 가리켜 애플리케이션보다 먼저 지운다 */
export async function 기준세트지우기(pool: Pool, serviceId: number): Promise<void> {
  await pool.query('DELETE FROM sched_set WHERE id IN (SELECT set_id FROM sched_set_item WHERE service_id = $1)', [serviceId]);
}
