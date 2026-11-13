// 정기 실행 세트를 지금 한 번 손으로 돌린다 — 오늘 회차를 지금 시각으로 세우면 admin 의 1분 점검이 줄 차례대로 시작한다 (도메인/정기실행 §3.16 「회차」)
// **HTTP 를 쓰지 않는 이유가 여기 있다** — 인증 없이 부를 수 있는 API 를 만들지 않으려고 컨테이너 안에서 DB 에 직접 세운다 (도메인/인증 §7 인증 적용 범위).
// 실행은 여기서 만들지 않는다 — 회차를 미는 곳이 둘이면 같은 줄을 두 번 만든다

import { pool } from '../apps/admin/src/db/index.js';

/** 인자 하나가 양의 정수일 때만 세트 번호다 */
export function 세트번호(인자: readonly string[]): number | null {
  const [첫] = 인자;
  return 인자.length === 1 && 첫 !== undefined && /^[1-9]\d*$/.test(첫) ? Number(첫) : null;
}

async function main(): Promise<void> {
  const id = 세트번호(process.argv.slice(2));
  if (id === null) {
    console.error('쓰는 법: npx tsx scripts/run-scheduled.ts <세트 번호>');
    process.exitCode = 1;
    return;
  }
  try {
    // 그날 하나는 UNIQUE 가 막는다 — 오늘 이미 섰으면 아무것도 안 세운다
    const r = await pool.query<{ id: string }>(
      `INSERT INTO sched_occurrence (set_id, planned_on, planned_at)
       SELECT id, (now() AT TIME ZONE tz)::date, now() FROM sched_set WHERE id = $1
       ON CONFLICT (set_id, planned_on) DO NOTHING RETURNING id`,
      [id],
    );
    const 세트 = await pool.query('SELECT 1 FROM sched_set WHERE id = $1', [id]);
    if (세트.rowCount === 0) throw new Error(`세트 ${String(id)} 이 없다. 정기 실행 화면의 세트 번호를 확인해라`);
    if (r.rows[0] === undefined) throw new Error(`세트 ${String(id)} 은 오늘 회차가 이미 있다. 정기 실행 달력에서 그 회차를 봐라`);
    // 그날 하나라 정한 시각의 회차는 이것으로 갈음한다 — 모르고 기다리지 않게 말해 둔다
    console.log(`회차 ${r.rows[0].id} 을 세웠다. 1분 안에 관리 서버가 프로젝트 줄 차례대로 시작한다. 오늘 정한 시각의 회차는 이것으로 갈음한다`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('run-scheduled.ts') === true) await main();
