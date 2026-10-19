// 정기 실행을 지금 한 번 손으로 돌린다 (SPEC 공통/6-인프라 §9.2). 매일 도는 것은 admin 이 설정을 보고 한다 — cron 에 걸지 않는다.
// **HTTP 를 쓰지 않는 이유가 여기 있다** — 인증 없이 부를 수 있는 API 를 만들지 않으려고
// 컨테이너 안에서 만든다 (§7 인증 적용 범위). 만드는 일은 admin 의 점검과 같은 함수다

import { pool } from '../apps/admin/src/db/index.js';
import { 정기실행을만든다 } from '../apps/admin/src/execution/scheduled.js';

const [prefix] = process.argv.slice(2);

if (prefix === undefined) {
  console.error('쓰는 법: npx tsx scripts/run-scheduled.ts <서비스 접두사>');
  process.exit(1);
}

try {
  // 켜 둔 서비스면 그날 돈 것으로 친다 — 마지막으로 돈 때를 적어 그날 점검이 한 번 더 돌리지 않게 한다.
  // 대상 서버는 설정에서 고른 줄, 꺼져 있으면 앞 판처럼 demo 다
  const r = await pool.query<{ env: string | null }>(
    `UPDATE service SET schedule_last = CASE WHEN schedule_at IS NULL THEN schedule_last ELSE now() END
      WHERE prefix = $1
      RETURNING schedule_env AS env`,
    [prefix],
  );
  const 서비스 = r.rows[0];
  if (서비스 === undefined) throw new Error(`${prefix} 서비스가 없다. 설정 화면의 접두사를 확인해라`);
  const 만든것 = await 정기실행을만든다(prefix, 서비스.env ?? 'demo', console);
  await 만든것.끝;
  if (만든것.runIds.length > 0) console.log(`실행 ${만든것.runIds.join(' · ')}이 끝났다`);
  if (만든것.실패) process.exitCode = 1;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
