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
  /** 이번 실행의 실패를 같은 사유끼리 묶은 것. 견줄 앞 실행이 없어도 낸다 */
  실패덩어리들: 실패덩어리[];
}

export interface 실패덩어리 {
  대표문장: string;
  건수: number;
  항목들: { historyId: number; tcId: string; tcName: string; platform: string }[];
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

/**
 * 대표 문장 한 줄의 상한. 검증 문장은 사람이 쓴 짧은 한국어라 여기 안 걸리고,
 * 여기 걸리는 것은 러너가 뱉은 오류 원문뿐이다.
 */
const 대표문장길이 = 120;

// 대표 문장은 실패한 첫 검증 문장이고, 없으면 error.message 다. 둘 다 없으면 NULL 로 나와 덩어리에서 빠진다 —
// 사유를 모르는 것을 지어내지 않는다.
// actual·expected 는 붙이지 않는다. 그 값이 비밀값일 수 있고, 붙이면 같은 고장이 값마다 갈라진다
const 대표문장뽑기 = `
  SELECT i.history_id, i.tc_id, i.tc_name, i.platform,
         COALESCE(
           (SELECT a.value->>'statement'
            FROM run_item_step s
            CROSS JOIN LATERAL jsonb_array_elements(s.assertions) WITH ORDINALITY AS a(value, ord)
            WHERE s.history_id = i.history_id AND a.value->>'status' = 'FAIL'
            ORDER BY s.seq, a.ord
            LIMIT 1),
           i.error->>'message'
         ) AS 대표문장
  FROM run_item i
  WHERE i.run_id = $1 AND i.status = 'FAIL'
  ORDER BY i.history_id`;

interface 사유행 {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: string;
  대표문장: string | null;
}

/**
 * 대표 문장을 **첫 줄 + 상한**으로 자른다.
 *
 * **셋을 한꺼번에 막는다.**
 * ① 검증 문장이 없는 실패는 `error.message` 가 대표인데, 그 값은 러너가 stderr 뒤 2000자를
 *    그대로 실어 보낸 것이다 (`apps/runner/src/execute.ts` 의 `tail()`). 경로·줄번호·시간이 섞여 있어
 *    **같은 고장이 실행마다 다른 글자가 되고 묶기가 한 덩어리도 못 만든다** — 건수 1짜리가 줄줄이 선다.
 *    묶어서 볼 값어치가 가장 큰 것이 바로 그런 실패(문법 오류·import 실패·러너 장애)다
 * ② 「**원문 오류(스택·주소·포트)는 목록에 쓰지 않는다**」가 이 저장소 규칙이다
 *    (`web/runState.ts`). 이 도구의 전제는 「코드를 몰라도 쓴다」다
 * ③ actual·expected 를 안 붙여 막은 비밀값이 **stderr 의 `Expected:`/`Received:` 블록으로 되돌아온다.**
 *    Playwright 가 그것을 통째로 뱉는다
 *
 * 원문은 항목 상세가 그대로 갖고 있다. 여기서 자르는 것은 **요약 자리에 원문을 두지 않는 것**이다.
 */
function 한줄로자른다(문장: string): string {
  const 첫줄 = (문장.split('\n')[0] ?? '').trim();
  return 첫줄.length > 대표문장길이 ? `${첫줄.slice(0, 대표문장길이)}…` : 첫줄;
}

/** 이번 실행의 실패 항목을 대표 문장이 같은 것끼리 묶는다 */
async function 사유로묶는다(pool: Pool, runId: number): Promise<실패덩어리[]> {
  const { rows } = await pool.query<사유행>(대표문장뽑기, [runId]);

  // 묶는 키는 대표 문장 글자 그대로다. 숫자·타임스탬프를 지우는 정규화를 넣으면 다른 사유가 한 덩어리로 합쳐지는데,
  // 안 묶인 것은 눈에 보여도 잘못 묶인 것은 안 보인다
  const 덩어리들 = new Map<string, 실패덩어리>();
  for (const row of rows) {
    if (row.대표문장 === null) continue;
    const 문장 = 한줄로자른다(row.대표문장);
    if (문장 === '') continue;
    const 덩어리 = 덩어리들.get(문장) ?? { 대표문장: 문장, 건수: 0, 항목들: [] };
    덩어리.건수 += 1;
    덩어리.항목들.push({
      historyId: Number(row.history_id),
      tcId: row.tc_id,
      tcName: row.tc_name,
      platform: row.platform,
    });
    덩어리들.set(문장, 덩어리);
  }

  // 같은 건수에서 사전순으로 못 박아야 검사가 흔들리지 않는다
  return [...덩어리들.values()].sort(
    (a, b) => b.건수 - a.건수 || (a.대표문장 < b.대표문장 ? -1 : a.대표문장 > b.대표문장 ? 1 : 0),
  );
}

/** 같은 서비스·같은 대상 서버의 바로 앞 실행을 찾아 케이스마다 무엇이 달라졌는지 낸다 */
export async function compareWithPrevious(runId: number): Promise<비교> {
  const pool = await db();

  const 이번 = await pool.query<{ service_id: string | null; env: string; base_url: string; started_at: Date }>(
    'SELECT service_id, env, base_url, started_at FROM test_run WHERE run_id = $1',
    [runId],
  );
  const 현재 = 이번.rows[0];
  if (현재 === undefined) throw new Error(`실행 ${runId}을 찾을 수 없다`);

  const 실패덩어리들 = await 사유로묶는다(pool, runId);

  // service_id 가 없는 옛 행은 견줄 짝을 특정할 수 없다. = 가 아무것도 안 물어 previous 는 null 로 떨어진다
  //
  // **아직 도는 중인 실행은 견줌 대상이 아니다.** 그 실행의 run_item 은 전부 status = 'NA' 로
  // 박혀 있어(store.ts 의 INSERT_ITEM) 접으면 통째로 NA 가 되고, 판정표[NA][FAIL] 이 새로깨짐이라
  // **어제도 그제도 깨져 있던 케이스가 전부 「이번에 새로 깨졌습니다」로 뜬다.**
  // 같은 서비스·같은 대상 서버에 도는 실행이 둘일 수 있다 — 막는 장치가 없다 (execution/dispatcher.ts).
  // RunInsights 가 **이번** 실행이 도는 중이면 안 부르는 것과 같은 이유이고, 그 거울상이다
  const 앞 = await pool.query<{ run_id: string; started_at: Date; base_url: string }>(
    `SELECT run_id, started_at, base_url FROM test_run
     WHERE service_id = $1 AND env = $2 AND started_at < $3 AND status <> 'RUNNING'
     ORDER BY started_at DESC
     LIMIT 1`,
    [현재.service_id, 현재.env, 현재.started_at],
  );
  const 직전 = 앞.rows[0];
  if (직전 === undefined) return { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들 };

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
    실패덩어리들,
  };
}
