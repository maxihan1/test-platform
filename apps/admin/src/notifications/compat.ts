// 알림의 호환성 줄 — 도는 호환성 실행은 점검 상태 · AI 점검 장 수, 끝난 것은 미판정 · 미점검 화면 수 (도메인/호환성 §3.13 「실행」 7)
// E2E 와 달리 끝난 호환성 실행은 recent 에 든다 — 미판정 수가 곧 할 일이다

import { 호환성요약들 } from '../compat/runView.js';
import type { RunSummary } from '../execution/runTypes.js';
import type { NoticeService, 보이는서비스 } from './store.js';

export type 호환성도는줄 = NoticeService & {
  kind: 'compat';
  runId: number;
  title: string;
  states: { done: number; total: number };
  checks: { done: number; total: number };
  startedAt: string;
};

export type 호환성끝난줄 = NoticeService & {
  kind: 'run';
  runId: number;
  title: string;
  env: string;
  testKind: 'COMPAT';
  status: RunSummary['status'];
  compat: { pending: number; unchecked: number };
  finishedAt: string;
};

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 끝난 것은 케이스 실행과 같은 날수 · 상한이다 */
export async function 호환성알림(
  서비스들: 보이는서비스[],
  서비스칸: (id: number) => NoticeService,
  최근날수: number,
  최근상한: number,
): Promise<{ running: 호환성도는줄[]; recent: 호환성끝난줄[] }> {
  const r = await (await db()).query<{ run_id: string; title: string; env: string; service_id: string; status: RunSummary['status']; started_at: Date; finished_at: Date | null }>(
    `(SELECT run_id, title, env, service_id, status, started_at, finished_at FROM test_run
       WHERE service_id = ANY($1) AND kind = 'COMPAT' AND status = 'RUNNING')
     UNION ALL
     (SELECT run_id, title, env, service_id, status, started_at, finished_at FROM test_run
       WHERE service_id = ANY($1) AND kind = 'COMPAT' AND status <> 'RUNNING' AND finished_at >= now() - make_interval(days => $2::int)
       ORDER BY finished_at DESC LIMIT $3)`,
    [서비스들.map((s) => s.id), 최근날수, 최근상한],
  );
  const 요약 = await 호환성요약들(r.rows.map((x) => Number(x.run_id)));
  const running: 호환성도는줄[] = [];
  const recent: 호환성끝난줄[] = [];
  for (const 줄 of r.rows) {
    const runId = Number(줄.run_id);
    const x = 요약.get(runId);
    const 머리 = { ...서비스칸(Number(줄.service_id)), runId, title: 줄.title };
    if (줄.status === 'RUNNING') {
      running.push({ ...머리, kind: 'compat', states: x?.states ?? { done: 0, total: 0 }, checks: x?.checks ?? { done: 0, total: 0 }, startedAt: 줄.started_at.toISOString() });
    } else {
      recent.push({
        ...머리, kind: 'run', env: 줄.env, testKind: 'COMPAT', status: 줄.status,
        compat: { pending: x?.pending ?? 0, unchecked: x?.unchecked ?? 0 }, finishedAt: 줄.finished_at!.toISOString(),
      });
    }
  }
  return { running, recent };
}
