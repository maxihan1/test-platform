// 성능 실행 하나를 대기 → 스모크 → 실행 중 → 끝으로 몬다 — 일 나눠 주기 · 1초 숫자 받기 · 자동 중단 · 끊김 (도메인/성능 §3.9 · §5.4)

import type { FastifyInstance } from 'fastify';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 끝내기, 끝내기배경 } from './finish.js';
import { generateScript, segments, splitRows } from './generator.js';
import { emptyHist } from './hist.js';
import { AGENT_LOST_SEC, autoStop, type SecRow } from './judge.js';
import { 단독스크립트 } from './pageScript.js';
import { 부하중쓰기 } from './pages.js';
import type { 페이지표본 } from './pageStats.js';
import { 정기성능점검 } from './schedule.js';
import { 끝난초여유, 도는것, 시작틈초, type Job, type 도는실행 } from './state.js';
import * as 표 from './store.js';
import type { PageRunConfig, Transaction } from './types.js';

export { 도는실행들 } from './state.js';
export type { Job } from './state.js';

const 글 = (e: unknown) => String(e instanceof Error ? e.message : e);

async function 재료(runId: number): Promise<{ run: 표.실행행; txs: Transaction[]; env: Record<string, string>; rows: string[] }> {
  const run = await 표.실행하나(runId);
  if (run === null || run.scenarioId === null) throw new Error(`실행 ${runId} 이 없습니다`);
  const pool = await 표.풀();
  const v = await pool.query<{ body: { transactions?: Transaction[] }; accounts_csv: string | null }>(
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
  return { run, txs: v.rows[0].body.transactions ?? [], env, rows };
}

const 시각 = (ms: number) => new Date(ms).toISOString();

async function 시작하기(run: 표.실행행): Promise<void> {
  const cfg = run.config;
  const { txs, env, rows } = await 재료(run.id);
  const startAt = Date.now() + 시작틈초 * 1000;
  const smokeAgent = cfg.agentIds[0] as number;
  const job: Job = {
    runId: run.id, kind: 'SMOKE', startAt: 시각(startAt), env, allowedHosts: cfg.allowedHosts, durationSec: 60,
    script: generateScript({ transactions: txs, load: cfg.load, smoke: true, allowedHosts: cfg.allowedHosts, maxVus: 1 }),
    ...(rows.length > 0 ? { accountsCsv: rows.join('\n') } : {}),
  };
  도는것.set(run.id, {
    runId: run.id, kind: 'LOAD', phase: 'SMOKE', startAt, durationSec: 60, agents: cfg.agentIds, monitors: cfg.monitorIds,
    pending: new Map([[smokeAgent, job]]), heard: new Map(), done: new Map(), smoke: { requests: 0, errors: 0 }, checkedSec: -1,
    lostMonitors: new Set(), errorLogged: false, ending: false, pageSamples: [],
  });
  // 대기 → 스모크는 한 문장으로 바꾼다. 그사이 사람이 중단했으면 바뀌지 않으니 일을 거둔다
  if (!(await 표.대기에서시작(run.id))) {
    도는것.delete(run.id);
    return;
  }
  await 표.에이전트맡기(run.id, cfg.agentIds);
  await 표.로그(run.id, '스모크 테스트를 시작합니다 — 가상 사용자 1명 · 1분');
}

/** 페이지 단독 측정 — 스모크 없이 에이전트 하나가 바로 잰다. 로그인할 페이지가 있을 때만 계정을 싣는다 */
async function 페이지시작하기(run: 표.실행행): Promise<void> {
  const cfg = run.config as unknown as PageRunConfig;
  const env: Record<string, string> = { BASE_URL: run.baseUrl };
  if (cfg.pages.some((p) => p.login)) {
    const 줄 = await 대상줄읽기(run.serviceId, run.env);
    if (줄?.loginId) env.ACCOUNT_ID = 줄.loginId;
    if (줄?.loginPassword) env.ACCOUNT_PW = 줄.loginPassword;
  }
  const startAt = Date.now() + 시작틈초 * 1000;
  const agentId = cfg.agentIds[0] as number;
  const job: Job = { runId: run.id, kind: 'PAGE', startAt: 시각(startAt), script: 단독스크립트(cfg), env, allowedHosts: cfg.allowedHosts, durationSec: cfg.durationSec };
  도는것.set(run.id, {
    runId: run.id, kind: 'PAGE', phase: 'RUNNING', startAt, durationSec: cfg.durationSec, agents: cfg.agentIds, monitors: [],
    pending: new Map([[agentId, job]]), heard: new Map(), done: new Map(), smoke: { requests: 0, errors: 0 }, checkedSec: -1,
    lostMonitors: new Set(), errorLogged: false, ending: false, pageSamples: [],
  });
  if (!(await 표.대기에서시작(run.id, 'RUNNING'))) {
    도는것.delete(run.id);
    return;
  }
  await 표.에이전트맡기(run.id, cfg.agentIds);
  await 표.로그(run.id, `페이지 측정을 시작합니다 — 페이지 ${cfg.pages.length}개 · 페이지마다 3번`);
}

async function 본테스트(live: 도는실행): Promise<void> {
  const { run, txs, env, rows } = await 재료(live.runId);
  const cfg = run.config;
  const agents = await 표.에이전트들(cfg.agentIds);
  const weights = cfg.agentIds.map((id) => 표.최대가상사용자(agents.find((a) => a.id === id) ?? ({ maxVus: null } as 표.에이전트행)));
  const segs = segments(weights);
  const parts = splitRows(rows, weights);
  const script = generateScript({ transactions: txs, load: cfg.load, smoke: false, allowedHosts: cfg.allowedHosts, maxVus: cfg.maxVus, pages: cfg.pageCheck ? (cfg.pages ?? null) : null });
  const startAt = Date.now() + 시작틈초 * 1000;
  live.phase = 'RUNNING';
  live.startAt = startAt;
  live.durationSec = cfg.durationSec;
  live.done.clear();
  live.heard.clear();
  live.pending.clear();
  cfg.agentIds.forEach((id, i) => {
    live.pending.set(id, {
      runId: run.id, kind: 'LOAD', startAt: 시각(startAt), script, env, allowedHosts: cfg.allowedHosts, durationSec: cfg.durationSec,
      segment: segs[i]?.segment, segmentSequence: segs[i]?.sequence,
      ...(rows.length > 0 ? { accountsCsv: (parts[i] ?? rows).join('\n') } : {}),
    });
  });
  for (const id of cfg.monitorIds) {
    live.pending.set(id, { runId: run.id, kind: 'MONITOR', startAt: 시각(startAt), script: null, env: {}, allowedHosts: [], durationSec: cfg.durationSec });
  }
  await 표.상태바꾸기(run.id, 'RUNNING');
  await 표.로그(run.id, `스모크 테스트를 통과했습니다 — 부하 발생 에이전트 ${cfg.agentIds.length}대로 본 테스트를 시작합니다`);
}

export function 일받기(agentId: number, mode: 'LOAD' | 'MONITOR'): Job | null {
  for (const live of 도는것.values()) {
    const job = live.pending.get(agentId);
    if (job === undefined || (mode === 'MONITOR') !== (job.kind === 'MONITOR')) continue;
    live.pending.delete(agentId);
    if (job.kind !== 'MONITOR') live.heard.set(agentId, live.startAt);
    return job;
  }
  return null;
}

export interface 부하초 {
  sec: number;
  vus: number;
  txs: { name: string; requests: number; errors: number; hist: number[] }[];
  // 페이지 단독 측정 · 부하 중 측정이 그 초에 연 것 (§5.4)
  pages?: 페이지표본[];
}

// 트랜잭션 줄들과 전체 줄(tx = '') 하나로 편다
export function 줄로펴기(m: 부하초): SecRow[] {
  const total: SecRow = { sec: m.sec, tx: '', vus: m.vus, requests: 0, errors: 0, hist: emptyHist() };
  const rows: SecRow[] = [];
  for (const t of m.txs) {
    rows.push({ sec: m.sec, tx: t.name, vus: m.vus, requests: t.requests, errors: t.errors, hist: t.hist });
    total.requests += t.requests;
    total.errors += t.errors;
    t.hist.forEach((n, i) => (total.hist[i] = (total.hist[i] ?? 0) + n));
  }
  return [total, ...rows];
}

/** 1초 숫자 받기. 도는 실행이 아니거나 맡지 않은 에이전트면 멈추라고 답한다 */
export async function 부하숫자받기(agentId: number, runId: number, m: 부하초): Promise<boolean> {
  const live = 도는것.get(runId);
  if (live === undefined || live.ending || !live.agents.includes(agentId)) return true;
  live.heard.set(agentId, Date.now());
  if (live.kind === 'PAGE') {
    live.pageSamples.push(...(m.pages ?? []));
    return false;
  }
  if (live.phase === 'SMOKE') {
    for (const t of m.txs) {
      live.smoke.requests += t.requests;
      live.smoke.errors += t.errors;
    }
    return false;
  }
  await 표.초더하기(runId, 줄로펴기(m));
  const run = m.pages?.length ? await 표.실행하나(runId) : null;
  if (run?.config.pages) await 부하중쓰기(runId, m.sec, run.config.pages, m.pages ?? []);
  return false;
}

export async function 서버숫자받기(agent: { id: number; name: string }, runId: number, m: Parameters<typeof 표.서버숫자쓰기>[2]): Promise<boolean> {
  const live = 도는것.get(runId);
  if (live === undefined || live.ending || !live.monitors.includes(agent.id)) return true;
  await 표.서버숫자쓰기(runId, agent, m);
  return false;
}

export async function 끝받기(agentId: number, runId: number, body: { status: 'OK' | 'ERROR'; reason?: string }): Promise<void> {
  const live = 도는것.get(runId);
  if (live === undefined || live.ending) return;
  if (live.monitors.includes(agentId)) {
    if (body.status === 'ERROR') await 표.로그(runId, `서버 모니터링이 멈췄습니다 — ${body.reason ?? ''}`.trim(), 'WARN');
    return;
  }
  if (!live.agents.includes(agentId)) return;
  live.heard.delete(agentId);
  if (body.status === 'ERROR') return 끝내기(runId, { kind: 'ERROR', why: body.reason ?? '에이전트가 오류를 알렸습니다' });
  if (live.phase === 'SMOKE') {
    if (live.smoke.errors > 0 || live.smoke.requests === 0) return 끝내기(runId, { kind: 'STOP', stop: { reason: 'SMOKE_FAILED' } });
    return 본테스트(live).catch((e: unknown) => 끝내기(runId, { kind: 'ERROR', why: 글(e) }));
  }
  live.done.set(agentId, 'OK');
  // 마지막 초들의 늦은 조각이 들어올 틈을 둔다
  if (live.agents.every((id) => live.done.has(id))) setTimeout(() => 끝내기배경(runId, { kind: 'DONE' }), 끝난초여유 * 1000).unref();
}

export async function 중단하기(runId: number): Promise<'OK' | 'NOT_RUNNING'> {
  const run = await 표.실행하나(runId);
  if (run === null || !['QUEUED', 'SMOKE', 'RUNNING'].includes(run.status)) return 'NOT_RUNNING';
  await 끝내기(runId, { kind: 'STOP', stop: { reason: 'USER' } });
  return 'OK';
}

async function 살피기(live: 도는실행, 지금: number): Promise<void> {
  const agents = await 표.에이전트들([...live.agents, ...live.monitors]);
  // 일을 돌리는 에이전트는 1초 숫자만 연락이다 — 다시 켜진 에이전트의 hello · claim 은 실행이 산 증거가 아니다.
  // 일을 기다리는 에이전트는 모든 통로가 연락이고 startAt 전의 기다림은 세지 않는다 (§5.4 · PERF-F1-03 시작 질문)
  const 조용 = (id: number) => {
    const a = agents.find((x) => x.id === id);
    const 마지막 = live.heard.get(id) ?? Math.max(a?.lastSeenAt?.getTime() ?? 0, live.startAt);
    return a === undefined || 지금 - 마지막 > AGENT_LOST_SEC * 1000;
  };
  if (live.agents.some(조용)) return 끝내기(live.runId, { kind: 'STOP', stop: { reason: 'AGENT_LOST' } });
  for (const id of live.monitors) {
    if (!live.lostMonitors.has(id) && 조용(id)) {
      live.lostMonitors.add(id);
      await 표.로그(live.runId, `${agents.find((a) => a.id === id)?.name ?? `에이전트 ${id}`} 모니터링 끊김`, 'WARN');
    }
  }
  if (live.phase !== 'RUNNING' || live.kind === 'PAGE') return;
  const 끝난초 = Math.floor((지금 - live.startAt) / 1000) - 끝난초여유;
  if (끝난초 <= live.checkedSec) return;
  const run = await 표.실행하나(live.runId);
  if (run === null) return;
  const scopes = run.config.targets.flatMap((t) => (t.scope ? [t.scope] : []));
  const rows = await 표.초읽기(live.runId, Math.max(0, 끝난초 - 20), 끝난초, ['', ...scopes]);
  live.checkedSec = 끝난초;
  if (!live.errorLogged) {
    const 첫에러 = rows.find((r) => r.tx === '' && r.errors > 0);
    if (첫에러) {
      live.errorLogged = true;
      await 표.로그(live.runId, `에러가 나기 시작했습니다 — 가상 사용자 ${첫에러.vus}명`, 'WARN');
    }
  }
  const stop = autoStop(rows, run.testType ?? 'LOAD', run.config.targets);
  if (stop !== null) await 끝내기(live.runId, { kind: 'STOP', stop });
}

async function 대기열(지금: number): Promise<void> {
  const 바쁜 = new Set([...도는것.values()].flatMap((l) => l.agents));
  for (const run of await 표.실행들(['QUEUED'])) {
    const agents = await 표.에이전트들(run.config.agentIds);
    if (agents.length !== run.config.agentIds.length) {
      await 끝내기(run.id, { kind: 'ERROR', why: '고른 부하 발생 에이전트가 지워졌습니다' });
      continue;
    }
    const 빈가 = agents.every((a) => !바쁜.has(a.id) && (a.busyRunId === null || a.busyRunId === run.id) && 표.연결됐나(a, 지금));
    if (!빈가) continue;
    agents.forEach((a) => 바쁜.add(a.id));
    await (run.kind === 'PAGE' ? 페이지시작하기(run) : 시작하기(run)).catch((e: unknown) => 끝내기(run.id, { kind: 'ERROR', why: 글(e) }));
  }
}

/** 메모리에 없는데 DB 에서 도는 실행 — admin 이 다시 켜졌거나 닫기가 실패했다. 이어 가지 못하니 오류로 닫고 에이전트를 푼다 */
export async function 고아닫기(): Promise<void> {
  for (const run of await 표.실행들(['SMOKE', 'RUNNING'])) {
    if (도는것.has(run.id)) continue;
    if (await 표.끝쓰기(run.id, { status: 'ERROR', verdict: null, stopReason: null, targets: null, peakVus: null, maxTps: null, p95: null, errorRate: null, degraded: null })) {
      await 표.로그(run.id, 'admin 이 이 실행을 이어 가지 못했습니다', 'WARN');
    }
  }
}

let 도는중 = false;
export async function 한번돌기(지금 = Date.now()): Promise<void> {
  if (도는중) return;
  도는중 = true;
  try {
    await 고아닫기();
    for (const live of [...도는것.values()]) await 살피기(live, 지금);
    await 대기열(지금);
  } finally {
    도는중 = false;
  }
}

export function 성능엔진켜기(app: FastifyInstance): void {
  const 틱 = setInterval(() => void 한번돌기().catch((e: unknown) => app.log.error(e, '성능 실행 살피기 실패')), 1000);
  // 정기 실행 점검 — 시각과 마지막으로 돈 때가 DB 에 있어 재기동해도 1분 넘게 밀리지 않는다 (공통/6 §9.2)
  const 점검 = setInterval(() => void 정기성능점검().catch((e: unknown) => app.log.error(e, '성능 정기 실행 점검 실패')), 60_000);
  app.addHook('onClose', async () => {
    clearInterval(틱);
    clearInterval(점검);
  });
}
