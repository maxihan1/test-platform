// 도는 실행의 남은 시간을 같은 케이스의 지난 소요 중간값으로 어림한다 (진행 화면 · 알림 통로가 쓴다)

import { limit } from './dispatcher.js';

/** 짝수 개면 가운데 둘의 평균. 값이 없으면 null */
export function 중간값(값들: readonly number[]): number | null {
  if (값들.length === 0) return null;
  const 순서 = [...값들].sort((a, b) => a - b);
  const 가운데 = Math.floor(순서.length / 2);
  return 순서.length % 2 === 1 ? 순서[가운데]! : Math.round((순서[가운데 - 1]! + 순서[가운데]!) / 2);
}

/**
 * 안 끝난 항목마다의 예상(지난 기록이 없으면 null)로 남은 시간을 낸다.
 * 기록 없는 항목은 이번 실행에서 끝난 항목의 평균으로 채우고, 그것도 없으면 null(=계산 중)
 */
export function 남은시간계산(미완예상: readonly (number | null)[], 끝난평균: number | null, 동시: number): number | null {
  if (미완예상.length === 0) return 0;
  let 합 = 0;
  for (const 예상 of 미완예상) {
    const 값 = 예상 ?? 끝난평균;
    if (값 === null) return null;
    합 += 값;
  }
  return Math.round(합 / Math.min(Math.max(1, 동시), 미완예상.length));
}

// 실행 번호 → 「tc_id|platform」별 지난 중간값. 진행 화면이 2초마다 부르는데 지난 기록은 실행 중에 안 바뀌어 한 번만 읽는다.
// ponytail: 프로세스 하나의 메모리라 재시작하면 다시 읽는다. 끝난 줄 알 때(미완 0건) 지우고, 안 지워진 실행이 쌓이면 오래된 것부터 버린다
const 지난기록 = new Map<number, Map<string, number>>();
const 지난기록상한 = 20;

const 키 = (tcId: string, platform: string) => `${tcId}|${platform}`;

async function 지난기록읽기(runId: number): Promise<Map<string, number>> {
  const 있음 = 지난기록.get(runId);
  if (있음 !== undefined) return 있음;

  const { pool } = await import('../db/index.js');
  // 색인 run_item(tc_id, platform, started_at DESC) 으로 항목마다 최근 5건만 읽는다. 중단 항목은 duration_ms = 0 이라 뺀다
  const 행들 = await pool.query<{ tc_id: string; platform: string; duration_ms: number }>(
    `SELECT k.tc_id, k.platform, h.duration_ms
       FROM (SELECT DISTINCT tc_id, platform FROM run_item WHERE run_id = $1) k
      CROSS JOIN LATERAL (
        SELECT duration_ms FROM run_item h
         WHERE h.tc_id = k.tc_id AND h.platform = k.platform AND h.run_id <> $1
           AND h.finished_at IS NOT NULL AND h.duration_ms > 0
         ORDER BY h.started_at DESC LIMIT 5
      ) h`,
    [runId],
  );
  const 모음 = new Map<string, number[]>();
  for (const r of 행들.rows) 모음.set(키(r.tc_id, r.platform), [...(모음.get(키(r.tc_id, r.platform)) ?? []), r.duration_ms]);
  const 중간 = new Map<string, number>();
  for (const [k, 값들] of 모음) 중간.set(k, 중간값(값들)!);

  지난기록.set(runId, 중간);
  if (지난기록.size > 지난기록상한) 지난기록.delete(지난기록.keys().next().value!);
  return 중간;
}

/** 남은 시간(ms). 어림할 근거가 아직 없으면 null — 화면은 「계산 중」 */
export async function 실행남은시간(runId: number): Promise<number | null> {
  const { pool } = await import('../db/index.js');
  const [미완, 평균] = await Promise.all([
    pool.query<{ tc_id: string; platform: string }>('SELECT tc_id, platform FROM run_item WHERE run_id = $1 AND finished_at IS NULL', [runId]),
    pool.query<{ avg: string | null }>(
      'SELECT avg(duration_ms) AS avg FROM run_item WHERE run_id = $1 AND finished_at IS NOT NULL AND duration_ms > 0',
      [runId],
    ),
  ]);
  if (미완.rows.length === 0) {
    지난기록.delete(runId);
    return 0;
  }
  const 기록 = await 지난기록읽기(runId);
  const 끝난평균 = 평균.rows[0]?.avg == null ? null : Number(평균.rows[0].avg);
  return 남은시간계산(
    미완.rows.map((r) => 기록.get(키(r.tc_id, r.platform)) ?? null),
    끝난평균,
    limit(),
  );
}
