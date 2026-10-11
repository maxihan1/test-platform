// 작성에 걸릴 시간을 같은 서비스의 지난 작성 소요 중간값으로 어림한다 (작성 상세 · 알림 통로가 쓴다)

import { 중간값 } from '../execution/eta.js';
import { db } from './store.js';

/** 같은 서비스에서 끝난 작성 · 다시 작성 최근 5건의 소요 중간값. 한 건도 없으면 null — 화면은 예상을 안 보인다 */
export async function 작성예상(서비스: number): Promise<{ ms: number; samples: number } | null> {
  const r = await (await db()).query<{ ms: string }>(
    `SELECT EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000 AS ms
       FROM authoring_request
      WHERE service_id = $1 AND status = 'DONE' AND kind IN ('AUTHOR', 'RERUN')
        AND started_at IS NOT NULL AND finished_at IS NOT NULL
      ORDER BY finished_at DESC LIMIT 5`,
    [서비스],
  );
  const ms = 중간값(r.rows.map((x) => Number(x.ms)));
  return ms === null ? null : { ms, samples: r.rows.length };
}
