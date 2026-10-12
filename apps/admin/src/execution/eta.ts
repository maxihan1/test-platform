// 도는 실행의 남은 시간을 같은 케이스의 지난 소요 중간값으로 어림한다 (진행 화면 · 알림 통로가 쓴다)

import { limit } from './dispatcher.js';
import { 종류조건 } from './runKind.js';

/** 짝수 개면 가운데 둘의 평균. 값이 없으면 null */
export function 중간값(값들: readonly number[]): number | null {
  if (값들.length === 0) return null;
  const 순서 = [...값들].sort((a, b) => a - b);
  const 가운데 = Math.floor(순서.length / 2);
  return 순서.length % 2 === 1 ? 순서[가운데]! : Math.round((순서[가운데 - 1]! + 순서[가운데]!) / 2);
}

/**
 * 안 끝난 항목마다의 예상(지난 기록이 없으면 null)과 칸 수로 남은 시간을 낸다.
 * 기록 없는 항목은 이번 실행에서 끝난 항목의 평균으로 채우고, 그것도 없으면 null(=계산 중)
 */
export function 남은시간계산(미완예상: readonly (number | null)[], 끝난평균: number | null, 칸: number): number | null {
  if (미완예상.length === 0) return 0;
  let 합 = 0;
  for (const 예상 of 미완예상) {
    const 값 = 예상 ?? 끝난평균;
    if (값 === null) return null;
    합 += 값;
  }
  return Math.round(합 / 칸);
}

/**
 * 이 실행이 쓸 수 있는 칸 수 — 동시 수와 안 끝난 케이스 수 중 작은 쪽을 지금 도는 실행들이 나눠 쓴다. 1 아래로는 안 내린다.
 * 케이스 수를 넘기는 까닭 — 같은 케이스 항목(회차 · PC · 모바일)은 하나씩 돌아 칸 하나만 쓴다(dispatcher · PRD-F9-36)
 * ponytail: 대기줄 순서와 안드로이드 따로 줄(전역 상한 밖)은 안 본다. 칸을 균등하게 나눈다고 어림할 뿐이다
 */
export function 칸수(동시: number, 미완케이스수: number, 도는실행수: number): number {
  return Math.max(1, Math.min(Math.max(1, 동시), 미완케이스수) / Math.max(1, 도는실행수));
}

/**
 * 한 케이스의 안 끝난 항목 합 가운데 가장 긴 것 — 같은 케이스 항목은 하나씩 돌아(dispatcher · PRD-F9-36) 칸을 나눠 써도 이보다 빨리 못 끝난다.
 * 예상이 빈 항목은 끝난 평균으로 채운다. 그것도 없으면 0 으로 센다 — 그때 남은시간계산이 이미 null 이다
 */
export function 가장긴케이스(미완: readonly { tcId: string; 예상: number | null }[], 끝난평균: number | null): number {
  const 합 = new Map<string, number>();
  for (const { tcId, 예상 } of 미완) 합.set(tcId, (합.get(tcId) ?? 0) + (예상 ?? 끝난평균 ?? 0));
  return Math.max(0, ...합.values());
}

/** 셈은 기준 시각 시점의 값이다. 그 뒤로 흐른 만큼 줄여 항목이 끝날 때마다 다시 맞춰지고 그사이에는 준다 */
export function 줄어든남은시간(셈: number | null, 기준시각: number, 지금: number): number | null {
  return 셈 === null ? null : Math.max(0, 셈 - (지금 - 기준시각));
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

/**
 * 남은 시간(ms). 어림할 근거가 아직 없으면 null — 화면은 「계산 중」.
 * 기준 시각은 이번 실행에서 마지막으로 끝난 항목의 시각(없으면 실행 시작)이고, 지금은 DB 시계다 — 테스트가 지금을 넘길 수 있다
 */
export async function 실행남은시간(runId: number, 지금?: Date): Promise<number | null> {
  const { pool } = await import('../db/index.js');
  const [미완, 집계, 도는실행] = await Promise.all([
    pool.query<{ tc_id: string; platform: string }>('SELECT tc_id, platform FROM run_item WHERE run_id = $1 AND finished_at IS NULL', [runId]),
    pool.query<{ avg: string | null; last_finished: Date | null; started_at: Date; now: Date }>(
      `SELECT avg(duration_ms) FILTER (WHERE finished_at IS NOT NULL AND duration_ms > 0) AS avg,
              max(finished_at) AS last_finished,
              (SELECT started_at FROM test_run WHERE run_id = $1) AS started_at,
              now() AS now
         FROM run_item WHERE run_id = $1`,
      [runId],
    ),
    pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM test_run WHERE status = 'RUNNING' AND ${종류조건('case', '')}`),
  ]);
  if (미완.rows.length === 0) {
    지난기록.delete(runId);
    return 0;
  }
  const 기록 = await 지난기록읽기(runId);
  const 줄 = 집계.rows[0]!;
  const 끝난평균 = 줄.avg == null ? null : Number(줄.avg);
  const 미완예상 = 미완.rows.map((r) => ({ tcId: r.tc_id, 예상: 기록.get(키(r.tc_id, r.platform)) ?? null }));
  const 나눈셈 = 남은시간계산(
    미완예상.map((m) => m.예상),
    끝난평균,
    칸수(limit(), new Set(미완.rows.map((r) => r.tc_id)).size, 도는실행.rows[0]!.n),
  );
  const 셈 = 나눈셈 === null ? null : Math.max(나눈셈, 가장긴케이스(미완예상, 끝난평균));
  return 줄어든남은시간(셈, (줄.last_finished ?? 줄.started_at).getTime(), (지금 ?? 줄.now).getTime());
}
