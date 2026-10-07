// 정기 실행 (SPEC §9.2). 서버의 cron 이 매일 새벽 서비스마다 이것을 건다.
// **HTTP 를 쓰지 않는 이유가 여기 있다** — 인증 없이 부를 수 있는 API 를 만들지 않으려고
// 컨테이너 안에서 만든다 (§7 인증 적용 범위). admin 안에 스케줄러를 넣지도 않는다 —
// 컨테이너가 재기동될 때마다 다음 실행 시각이 흔들린다

import { listCases } from '../apps/admin/src/catalog/store.js';
import { pool } from '../apps/admin/src/db/index.js';
import { dispatch } from '../apps/admin/src/execution/dispatcher.js';
import { 앱케이스를뺀다 } from '../apps/admin/src/execution/location.js';
import { 종류별로나눈다 } from '../apps/admin/src/execution/runKind.js';
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

  // 실행 위치를 고를 사람이 없고, 이 프로세스는 admin 과 달라 디바이스 잠금을 같이 못 본다
  const { 남은, 뺀수 } = 앱케이스를뺀다(목록.items);
  if (뺀수 > 0) {
    console.log(`android 케이스 ${String(뺀수)}건은 정기 실행에서 뺐다 — 디바이스 팜이 붙기 전까지 (SPEC 공통/6-인프라 §9.2)`);
  }
  if (남은.length === 0) {
    console.log(`${prefix} 서비스에 정기 실행으로 돌릴 케이스가 없어 실행을 만들지 않았다`);
    process.exit(0);
  }

  const items = 남은.map((c) => ({
    tcId: c.tcId,
    platforms: c.platforms,
    // 빈 칸으로 보낸다. 요청에 없는 칸은 createRun 이 케이스 저장값(case_input)으로 채우고, 그것도 없으면
    // **케이스 코드에 적힌 기본값**으로 돈다 — 사람이 채워야만 도는 케이스가 없도록 §4 K10이 강제한다.
    // 이름 약속은 여전히 없다 — 저장값은 케이스마다 한 벌이라 고를 이름이 필요 없다 (도메인/실행 §3.2 · 인프라 §9.2)
    params: {},
    expected: {},
  }));

  // 실행 하나에 한 종류다 — UI · 기능을 따로 만든다. 한쪽이 실패해도 다른 쪽은 돈다. 아침 Slack 도 둘이다 (SPEC 공통/4-데이터모델 「실행 종류」)
  const 이름 = { UI: 'UI 테스트', FN: '기능 테스트' } as const;
  let 실패 = false;
  for (const 묶음 of 종류별로나눈다(items)) {
    try {
      const { runId, items: 보낼것 } = await createRun({
        title: `정기 실행 ${오늘} · ${이름[묶음.kind]}`,
        // 사람이 아니므로 사람 이름을 받지 않는다 (SPEC §9.2).
        // 이름 칸도 같이 박는다 — 비워 두면 「실행자 미상 (인증 도입 이전)」으로 읽히는데
        // 정기 실행은 누가 돌렸는지 아는 실행이다 (SPEC §8.6)
        triggeredBy: '스케줄러',
        triggeredByName: '스케줄러',
        env: 'demo',
        // 반복은 테스트 코드를 검증하는 도구지 추이를 만드는 도구가 아니다 (SPEC §8.2)
        repeat: 1,
        // 새벽에 도는 것을 볼 사람이 없다. 아침에 Slack 에서 보는 것이 유일한 경로다 (SPEC §8.9)
        notifySlack: true,
        items: 묶음.items,
      });

      console.log(`실행 ${String(runId)}(${이름[묶음.kind]})을 만들었다. 케이스 ${String(묶음.items.length)}건 · 항목 ${String(보낼것.length)}건`);
      await dispatch(runId, 보낼것);
      console.log(`실행 ${String(runId)}이 끝났다`);
    } catch (err) {
      실패 = true;
      console.error(`${이름[묶음.kind]} 실행 실패 —`, err instanceof RunInputError ? `${err.code}: ${err.message}` : err);
    }
  }
  if (실패) process.exitCode = 1;
} catch (err) {
  console.error(err instanceof RunInputError ? `${err.code}: ${err.message}` : err);
  process.exit(1);
} finally {
  await pool.end();
}
