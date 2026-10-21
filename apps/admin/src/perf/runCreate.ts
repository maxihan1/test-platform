// 성능 실행 만들기 — 검사와 INSERT. 사람이 누른 실행(POST /perf/runs)과 정기 실행 점검이 같이 탄다 (도메인/성능 §7 「정기 실행」)

import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { totalDuration } from './generator.js';
import { API서버호스트, 계정줄들, 단계, 목표, 허용밖, 호스트 } from './scenarios.js';
import * as 표 from './store.js';
import type { RunConfig, ScenarioBody } from './types.js';

// 한 실행은 24시간까지다 (§3.9 「상한」)
const 최대실행초 = 86_400;

export const 실행만들기본문 = z.object({
  scenarioId: z.number().int().positive(),
  env: z.string().min(1).max(100),
  testType: z.enum(['LOAD', 'STRESS', 'SPIKE', 'SOAK']),
  basis: z.enum(['VUS', 'TPS']).default('VUS'),
  stages: z.array(단계).min(1).max(50),
  targets: z.array(목표).max(50),
  agentIds: z.array(z.number().int().positive()).min(1).max(20),
  monitorIds: z.array(z.number().int().positive()).max(20).default([]),
  pageCheck: z.boolean().default(false),
});

export type 실행입력 = z.infer<typeof 실행만들기본문>;

export interface 실행만든이 {
  origin: 'MANUAL' | 'SCHEDULED';
  triggeredBy: string | null;
  triggeredByName: string | null;
}

/** 거절은 던지지 않고 값으로 낸다. 대상서버문제 는 그 대상 서버 줄이 없거나 실서비스 서버라 정기 실행을 꺼야 하는 거절이다 */
export type 만들기결과 = { runId: number } | { status: number; error: string; detail?: string; 대상서버문제?: true };

const 거절 = (status: number, error: string, detail?: string, 대상서버문제?: true): 만들기결과 => ({
  status, error, ...(detail === undefined ? {} : { detail }), ...(대상서버문제 === undefined ? {} : { 대상서버문제 }),
});

export async function 실행세우기(b: 실행입력, 누가: 실행만든이): Promise<만들기결과> {
  if (new Set(b.agentIds).size !== b.agentIds.length || new Set(b.monitorIds).size !== b.monitorIds.length) return 거절(400, 'INVALID_REQUEST', '에이전트가 겹칩니다');
  const pool = await 표.풀();
  const s = await pool.query<{ service_id: string; version: number; accounts_csv: string | null; body: ScenarioBody }>(
    `SELECT s.service_id, s.version, s.accounts_csv, v.body FROM perf_scenario s
       JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [b.scenarioId],
  );
  const sc = s.rows[0];
  if (sc === undefined) return 거절(404, 'NOT_FOUND');
  const serviceId = Number(sc.service_id);
  // 더미 클라이언트 띄우기는 PERF-F1-10, 부하 중 페이지 측정(브라우저)은 PERF-F1-07 에서 생긴다
  if (sc.body.dummyClient !== undefined) return 거절(400, 'INVALID_REQUEST', '더미 클라이언트 시나리오는 아직 실행하지 못합니다');
  if (b.pageCheck) return 거절(400, 'INVALID_REQUEST', '부하 중 페이지 로딩 측정은 아직 켜지 못합니다');

  const 줄 = await 대상줄읽기(serviceId, b.env);
  if (줄 === null) return 거절(400, 'INVALID_REQUEST', '대상 서버가 없습니다', true);
  if (줄.isProd) return 거절(400, 'PROD_ENV_BLOCKED', undefined, true);
  const api = await API서버호스트(serviceId);
  const 대상호스트 = 호스트(줄.baseUrl);
  if (대상호스트 === null) return 거절(400, 'INVALID_REQUEST', '대상 서버 주소가 틀렸습니다');
  const allowedHosts = [...new Set([대상호스트, ...(api?.hosts ?? [])])];
  const 밖 = 허용밖(sc.body.transactions ?? [], new Set(allowedHosts));
  if (밖 !== null) return 거절(400, 'HOST_NOT_ALLOWED', 밖);

  const agents = await 표.에이전트들([...b.agentIds, ...b.monitorIds]);
  const 부하 = b.agentIds.map((id) => agents.find((a) => a.id === id));
  if (부하.some((a) => a === undefined || a.mode !== 'LOAD' || !표.연결됐나(a))) return 거절(409, 'NO_AGENT');
  // 남의 프로젝트 서버에 깐 모니터링 에이전트는 고르지 못한다 (§3.9 「서버 모니터링」)
  if (b.monitorIds.some((id) => { const a = agents.find((x) => x.id === id); return a === undefined || a.mode !== 'MONITOR' || a.projectId !== api?.projectId; })) {
    return 거절(400, 'INVALID_REQUEST', '그 프로젝트의 모니터링 에이전트가 아닙니다');
  }
  const maxVus = 부하.reduce((n, a) => n + (a === undefined ? 0 : 표.최대가상사용자(a)), 0);
  const load = { basis: b.basis, stages: b.stages };
  const durationSec = totalDuration(load);
  if (durationSec > 최대실행초) return 거절(400, 'INVALID_REQUEST', '실행 시간은 24시간까지입니다');
  if (b.basis === 'VUS' && Math.max(...b.stages.map((x) => x.target)) > maxVus) return 거절(400, 'INVALID_REQUEST', `가상 사용자는 고른 에이전트의 최대 ${maxVus}명까지입니다`);

  const config: RunConfig = {
    testType: b.testType, load, targets: b.targets, agentIds: b.agentIds, monitorIds: b.monitorIds, allowedHosts,
    pageCheck: false, accountsRows: sc.accounts_csv === null ? 0 : 계정줄들(sc.accounts_csv).length, durationSec, maxVus,
  };
  const r = await pool.query<{ id: string }>(
    `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, env, base_url, test_type, config, status, origin, triggered_by, triggered_by_name)
     VALUES ('LOAD', $1, $2, $3, $4, $5, $6, $7, 'QUEUED', $8, $9, $10) RETURNING id`,
    [serviceId, b.scenarioId, sc.version, b.env, 줄.baseUrl, b.testType, JSON.stringify(config), 누가.origin, 누가.triggeredBy, 누가.triggeredByName],
  );
  const runId = Number(r.rows[0]?.id);
  await 표.로그(runId, '실행을 만들었습니다 — 부하 발생 에이전트가 비면 시작합니다');
  return { runId };
}
