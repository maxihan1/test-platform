// 성능 결과 한 건에 붙는 계산 칸 — 트랜잭션별 셈 · 견줌 지점 · 가장 최근 AI 분석 일 (도메인/성능 §7 「실행」)

import { bandSecs, comparePoint, judgeWindow, transactionViews, type SecRow, type TxView } from './judge.js';
import * as 표 from './store.js';
import type { Transaction } from './types.js';

export interface 실행보기칸 {
  transactions: TxView[];
  comparePoint: number | null;
  aiJob: { id: number; status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' } | null;
}

const 끝난상태 = ['DONE', 'STOPPED', 'ERROR'];

export async function AI일읽기(runId: number): Promise<실행보기칸['aiJob']> {
  const r = await (await 표.풀()).query<{ id: string; status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' }>(
    `SELECT id, status FROM perf_ai_job WHERE run_id = $1 AND kind = 'ANALYZE_RUN' ORDER BY id DESC LIMIT 1`,
    [runId],
  );
  return r.rows[0] === undefined ? null : { id: Number(r.rows[0].id), status: r.rows[0].status };
}

async function 시나리오순서(run: 표.실행행): Promise<string[]> {
  if (run.scenarioId === null) return [];
  const r = await (await 표.풀()).query<{ body: { transactions?: Transaction[] } }>(
    'SELECT body FROM perf_scenario_version WHERE scenario_id = $1 AND version = $2',
    [run.scenarioId, run.scenarioVersion],
  );
  return (r.rows[0]?.body.transactions ?? []).map((t) => t.name);
}

/**
 * 트랜잭션별 줄은 끝난 실행만 센다 — 도는 실행은 화면이 series 로 그린다.
 * 멈춘 실행의 판정 구간은 멈추게 한 초가 저장돼 있지 않아 전체 줄의 마지막 초로 갈음한다
 */
// ponytail: 견줄 초의 트랜잭션 줄을 통째로 메모리에 올린다. 24시간 × 트랜잭션 수백 개면 SQL 로 합치는 쪽으로 옮긴다
async function 트랜잭션들(run: 표.실행행, stopReason: string | null, 전체줄: SecRow[]): Promise<{ transactions: TxView[]; point: number | null }> {
  const prevId = run.scenarioId === null ? null : await 표.이전실행(run);
  const 순서 = await 시나리오순서(run);
  if (prevId === null) {
    const 멈춤 = stopReason === 'TARGET_EXCEEDED' || stopReason === 'ERROR_LIMIT' ? 전체줄.reduce((x, r) => Math.max(x, r.sec), 0) : null;
    const secs = judgeWindow(전체줄, 멈춤).map((r) => r.sec);
    return { transactions: transactionViews(순서, await 표.트랜잭션줄읽기(run.id, secs), null), point: null };
  }
  const prevTotal = await 표.초읽기(prevId, 0, 2 ** 31 - 1, ['']);
  const point = comparePoint(전체줄, prevTotal);
  const now = await 표.트랜잭션줄읽기(run.id, [...bandSecs(전체줄, point)]);
  const prev = await 표.트랜잭션줄읽기(prevId, [...bandSecs(prevTotal, point)]);
  return { transactions: transactionViews(순서, now, prev), point };
}

export async function 실행보기(run: 표.실행행, status: string, stopReason: string | null): Promise<실행보기칸> {
  const aiJob = await AI일읽기(run.id);
  if (!끝난상태.includes(status)) return { transactions: [], comparePoint: null, aiJob };
  const { transactions, point } = await 트랜잭션들(run, stopReason, await 표.초읽기(run.id, 0, 2 ** 31 - 1, ['']));
  return { transactions, comparePoint: point, aiJob };
}
