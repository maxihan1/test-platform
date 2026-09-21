// 직전 실행과 견줘 케이스마다 무엇이 달라졌는지 낸다 (SPEC §7 Reporting)
// 읽기 전용이다 — Reporting 컨텍스트가 쓰는 표는 evidence_document 하나뿐이다 (SPEC §3.3)

import type { Pool } from 'pg';

export type 변화 = '새로깨짐' | '계속깨짐' | '고쳐짐' | '그대로';

export interface 비교 {
  previous: { runId: number; startedAt: string } | null;
  /** 같은 env 뒤의 주소를 설정 화면에서 바꿨으면 사실은 다른 서버다. 막지는 않고 사실만 알린다 */
  주소바뀜: boolean;
  /** 앞 실행에는 있었고 이번에 없는 (케이스, 디바이스)의 수 */
  빠진건수: number;
  케이스들: { tcId: string; tcName: string; platform: string; 판정: 변화 }[];
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

type 접힌판정 = 'PASS' | 'FAIL' | 'NA';

interface 접힌행 {
  tc_id: string;
  tc_name: string;
  platform: string;
  status: 접힌판정;
}

// 반복 회차를 한 (케이스, 디바이스)로 먼저 접는다. 안 접고 맞추면 5회 × 5회 = 25쌍이 나온다.
// 갈래가 셋인 것이 핵심이다 — bool_and(status = 'PASS') 만 쓰면 NA(미실행)까지 「통과 아님」으로 묶여
// 한 번도 못 돈 케이스가 실패로 잡히고, 러너가 고장 난 것이 케이스 탓으로 보인다 (SPEC §8.5).
// 접는 규칙의 정본은 SPEC §8.3 회차 요약이고 화면 쪽 같은 규칙은 web/group.ts 의 회차요약() 이다
const 접기 = `
  SELECT tc_id,
         max(tc_name) AS tc_name,
         platform,
         CASE WHEN bool_or(status = 'FAIL')  THEN 'FAIL'
              WHEN bool_and(status = 'PASS') THEN 'PASS'
              ELSE 'NA' END AS status
  FROM run_item
  WHERE run_id = $1
  GROUP BY tc_id, platform
  ORDER BY tc_id, platform`;

// 빠지는 조합이 없어야 한다. 앞이 NA 였다가 이번에 FAIL 이면 「이번에 처음 깨진 것」이 맞다 —
// 그대로로 묻으면 새 실패가 칸에서 사라진다. 반대로 이번이 NA 인 것은 아직 못 돈 것이라 판정하지 않는다
const 판정표: Record<접힌판정, Record<접힌판정, 변화>> = {
  PASS: { PASS: '그대로', FAIL: '새로깨짐', NA: '그대로' },
  FAIL: { PASS: '고쳐짐', FAIL: '계속깨짐', NA: '그대로' },
  NA: { PASS: '그대로', FAIL: '새로깨짐', NA: '그대로' },
};

const 키 = (row: 접힌행): string => `${row.tc_id}\u0000${row.platform}`;

const 앞없음: 비교 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [] };

/** 같은 서비스·같은 대상 서버의 바로 앞 실행을 찾아 케이스마다 무엇이 달라졌는지 낸다 */
export async function compareWithPrevious(runId: number): Promise<비교> {
  const pool = await db();

  const 이번 = await pool.query<{ service_id: string | null; env: string; base_url: string; started_at: Date }>(
    'SELECT service_id, env, base_url, started_at FROM test_run WHERE run_id = $1',
    [runId],
  );
  const 현재 = 이번.rows[0];
  if (현재 === undefined) throw new Error(`실행 ${runId}을 찾을 수 없다`);

  // service_id 가 없는 옛 행은 견줄 짝을 특정할 수 없다. = 가 아무것도 안 물어 previous 는 null 로 떨어진다
  const 앞 = await pool.query<{ run_id: string; started_at: Date; base_url: string }>(
    `SELECT run_id, started_at, base_url FROM test_run
     WHERE service_id = $1 AND env = $2 AND started_at < $3
     ORDER BY started_at DESC
     LIMIT 1`,
    [현재.service_id, 현재.env, 현재.started_at],
  );
  const 직전 = 앞.rows[0];
  if (직전 === undefined) return 앞없음;

  const [이번접힘, 앞접힘] = await Promise.all([
    pool.query<접힌행>(접기, [runId]),
    pool.query<접힌행>(접기, [Number(직전.run_id)]),
  ]);
  const 이번칸 = new Map(이번접힘.rows.map((row) => [키(row), row]));

  const 케이스들: 비교['케이스들'] = [];
  let 빠진건수 = 0;
  for (const 앞행 of 앞접힘.rows) {
    const 이번행 = 이번칸.get(키(앞행));
    if (이번행 === undefined) {
      빠진건수 += 1;
      continue;
    }
    케이스들.push({
      tcId: 이번행.tc_id,
      tcName: 이번행.tc_name,
      platform: 이번행.platform,
      판정: 판정표[앞행.status][이번행.status],
    });
  }
  // 앞 실행에 없던 케이스는 어느 칸에도 넣지 않는다. 새 케이스를 「고쳐짐」으로 세면 거짓이다 —
  // 그래서 이번 것이 아니라 앞 것을 훑는다

  return {
    previous: { runId: Number(직전.run_id), startedAt: 직전.started_at.toISOString() },
    주소바뀜: 직전.base_url !== 현재.base_url,
    빠진건수,
    케이스들,
  };
}
