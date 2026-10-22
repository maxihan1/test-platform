// 성능 실행 하나의 재료 — 시나리오 버전 · 대상 서버 환경값 · 계정 줄 · 더미 클라이언트 · proto 파일 (도메인/성능 §3.9 · §5.4)

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 더미읽기, type 더미 } from './dummyRun.js';
import { protoFiles } from './generator.js';
import * as 표 from './store.js';
import type { Transaction } from './types.js';

export async function 재료(runId: number): Promise<{ run: 표.실행행; txs: Transaction[]; env: Record<string, string>; rows: string[]; dummy: 더미 | null }> {
  const run = await 표.실행하나(runId);
  if (run === null || run.scenarioId === null) throw new Error(`실행 ${runId} 이 없습니다`);
  const pool = await 표.풀();
  const v = await pool.query<{ body: { transactions?: Transaction[]; dummyClient?: number }; accounts_csv: string | null }>(
    `SELECT v.body, s.accounts_csv FROM perf_scenario_version v JOIN perf_scenario s ON s.id = v.scenario_id
      WHERE v.scenario_id = $1 AND v.version = $2`,
    [run.scenarioId, run.scenarioVersion],
  );
  const 줄 = await 대상줄읽기(run.serviceId, run.env);
  if (v.rows[0] === undefined || 줄 === null) throw new Error('시나리오 버전이나 대상 서버 줄이 없어졌습니다');
  // 대기하는 사이 그 줄이 실서비스 서버가 될 수 있다 — 부하를 걸기 직전에 한 번 더 본다 (§3.9 결정 10)
  if (줄.isProd) throw new Error('대상 서버가 실서비스 서버로 바뀌어 부하를 걸지 않았습니다');
  const env: Record<string, string> = { BASE_URL: run.baseUrl };
  if (줄.loginId) env.ACCOUNT_ID = 줄.loginId;
  if (줄.loginPassword) env.ACCOUNT_PW = 줄.loginPassword;
  const rows = (v.rows[0].accounts_csv ?? '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const dummyId = v.rows[0].body.dummyClient;
  const dummy = dummyId === undefined ? null : await 더미읽기(dummyId);
  if (dummyId !== undefined && dummy === null) throw new Error('더미 클라이언트가 지워졌습니다');
  return { run, txs: v.rows[0].body.transactions ?? [], env, rows, dummy };
}

export function 파일칸(txs: readonly Transaction[]): { files?: Record<string, string> } {
  const files = protoFiles(txs);
  return Object.keys(files).length > 0 ? { files } : {};
}
