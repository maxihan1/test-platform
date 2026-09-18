// 정기 실행 (SPEC §9.2). 서버의 cron 이 매일 새벽 서비스마다 이것을 건다.
// **HTTP 를 쓰지 않는 이유가 여기 있다** — 인증 없이 부를 수 있는 API 를 만들지 않으려고
// 컨테이너 안에서 만든다 (§7 인증 적용 범위). admin 안에 스케줄러를 넣지도 않는다 —
// 컨테이너가 재기동될 때마다 다음 실행 시각이 흔들린다

import { listCases } from '../apps/admin/src/catalog/store.js';
import { pool } from '../apps/admin/src/db/index.js';
import { dispatch } from '../apps/admin/src/execution/dispatcher.js';
import { createRun, MAX_ITEMS, RunInputError } from '../apps/admin/src/execution/store.js';

const [prefix] = process.argv.slice(2);

if (prefix === undefined) {
  console.error('쓰는 법: npx tsx scripts/run-scheduled.ts <서비스 접두사>');
  process.exit(1);
}

const 오늘 = new Date().toISOString().slice(0, 10);

try {
  const 목록 = await listCases({
    service: prefix,
    q: '',
    activeOnly: true,
    page: 1,
    pageSize: MAX_ITEMS,
  });

  if (목록.items.length === 0) {
    console.error(`${prefix} 서비스에 활성 케이스가 없다. 스캔이 돌았는지 확인해라`);
    process.exit(1);
  }

  const items = 목록.items.map((c) => ({
    tcId: c.tcId,
    platforms: c.platforms,
    // 값은 **케이스 코드에 적힌 기본값**으로 돈다. 사람이 채워야만 도는 케이스가 없도록 §4 K10이 강제한다.
    // 저장된 입력값 묶음에 이름 약속을 만들지 않는다 — 진실의 원천은 코드다 (SPEC §3.1 · §9.2)
    params: {},
    expected: {},
  }));

  const { runId, items: 보낼것 } = await createRun({
    title: `정기 실행 ${오늘}`,
    // 사람이 아니므로 사람 이름을 받지 않는다 (SPEC §9.2)
    triggeredBy: '스케줄러',
    env: 'demo',
    // 반복은 테스트 코드를 검증하는 도구지 추이를 만드는 도구가 아니다 (SPEC §8.2)
    repeat: 1,
    // 새벽에 도는 것을 볼 사람이 없다. 아침에 Slack 에서 보는 것이 유일한 경로다 (SPEC §8.9)
    notifySlack: true,
    items,
  });

  console.log(`실행 ${String(runId)}을 만들었다. 케이스 ${String(목록.items.length)}건 · 항목 ${String(보낼것.length)}건`);
  await dispatch(runId, 보낼것);
  console.log(`실행 ${String(runId)}이 끝났다`);
} catch (err) {
  console.error(err instanceof RunInputError ? `${err.code}: ${err.message}` : err);
  process.exit(1);
} finally {
  await pool.end();
}
