// 성능 테스트 화면이 서버를 부르는 호출 모음. 응답 모양은 admin 의 perf/*.ts 를 그대로 옮겼다 (도메인/성능 §7)

import { call, json } from './api.js';

export type TestType = 'LOAD' | 'STRESS' | 'SPIKE' | 'SOAK';
export type Basis = 'VUS' | 'TPS';

export interface Extract {
  var: string;
  where: 'JSON' | 'HEADER' | 'COOKIE';
  path: string;
  pick: 'FIRST' | 'RANDOM';
}

export interface Transaction {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  extract?: Extract[];
  check?: { status?: number[]; contains?: string };
  thinkTimeSec?: number;
}

export interface Stage {
  durationSec: number;
  target: number;
}

export interface Target {
  metric: 'P95' | 'ERROR_RATE' | 'TPS';
  scope?: string;
  op: '<=' | '>=';
  value: number;
  source: 'PRD' | 'AI' | 'MANUAL';
  reqId?: string;
}

/** 마법사 4단계에서 고른 것과 2단계 입력 칸. 서버는 `run` 을 들여다보지 않고 그대로 둔다 (perf/scenarios.ts 본문) */
export interface 마법사값 {
  env?: string;
  agentIds?: number[];
  monitorIds?: number[];
  maxVus?: number;
  rampMin?: number;
  holdMin?: number;
  peakVus?: number;
  degradeAlert?: boolean;
}

export interface ScenarioBody {
  transactions?: Transaction[];
  dummyClient?: number;
  load?: { basis: Basis; stages: Stage[]; testType?: TestType };
  targets?: Target[];
  run?: 마법사값;
}

export interface PerfScenarioRow {
  id: number;
  name: string;
  version: number;
  updatedAt: string | null;
  lastRun: { id: number; status: string; verdict: string | null; createdAt: string } | null;
}

export interface PerfScenario {
  id: number;
  serviceId: number;
  name: string;
  version: number;
  body: ScenarioBody;
  accountsRows: number;
  versions: { version: number; source: string; createdAt: string; createdBy: string }[];
}

export interface PerfAgent {
  id: number;
  name: string;
  mode: 'LOAD' | 'MONITOR';
  projectId: number | null;
  host: string | null;
  status: 'CONNECTED' | 'BUSY' | 'OFFLINE';
  maxVus: number | null;
  lastSeenAt: string | null;
  version: string | null;
}

export type AI일상태 = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface 초안결과 {
  transactions: Transaction[];
  /** 트랜잭션 이름 → AI 설명 */
  notes?: Record<string, string>;
  excluded?: { url: string; reason: string }[];
  unconverted?: { what: string; why: string }[];
  recorded?: { total: number; staticExcluded: number; used: number; excluded: number };
}

export interface 부하추천 {
  dailyVisitors: number | null;
  peakRatio: number | null;
  avgStayMin: number | null;
  reqIds: string[];
  basis: string[];
  peakMinutes: number;
  peakVus: number | null;
  maxVus: number | null;
}

export interface 목표추천 {
  targets: Target[];
  basis: string[];
}

export interface AI일<T> {
  status: AI일상태;
  output?: T;
  error?: string;
}

export type 초안요청 =
  | { serviceId: number; from: 'RECORD'; env: string; scenarioId: number }
  | { serviceId: number; from: 'SWAGGER'; apiDocVersion: number; operations: { method: string; path: string }[] };

export const perfApi = {
  scenarios: (serviceId: number) => call<{ scenarios: PerfScenarioRow[] }>(`/perf/scenarios?serviceId=${String(serviceId)}`),
  scenario: (id: number) => call<PerfScenario>(`/perf/scenarios/${String(id)}`),
  create: (serviceId: number, name: string, body: ScenarioBody, draftJobId?: number) =>
    call<{ id: number; version: number }>('/perf/scenarios', json({ serviceId, name, body, draftJobId })),
  save: (id: number, body: ScenarioBody, 덧: { accountsCsv?: string; draftJobId?: number } = {}) =>
    call<{ version: number }>(`/perf/scenarios/${String(id)}`, { ...json({ body, ...덧 }), method: 'PUT' }),
  remove: (id: number) => call<undefined>(`/perf/scenarios/${String(id)}`, { method: 'DELETE' }),
  draft: (요청: 초안요청) => call<{ jobId: number }>('/perf/scenarios/draft', json(요청)),
  // 파일은 본문 그대로 보낸다 — 더미 클라이언트 올리기와 같은 꼴이다 (§7 「파일 초안」)
  draftFile: (serviceId: number, file: File) =>
    call<{ jobId: number }>(
      `/perf/scenarios/draft?serviceId=${String(serviceId)}&from=FILE&name=${encodeURIComponent(file.name)}`,
      { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file },
    ),
  suggest: (serviceId: number, kind: 'LOAD' | 'TARGETS', scenarioId?: number) =>
    call<{ jobId: number }>('/perf/suggest', json({ serviceId, kind, scenarioId })),
  job: <T>(id: number) => call<AI일<T>>(`/perf/ai-jobs/${String(id)}`),
  run: (요청: { scenarioId: number; env: string; testType: TestType; basis: Basis; stages: Stage[]; targets: Target[]; agentIds: number[]; monitorIds: number[] }) =>
    call<{ runId: number }>('/perf/runs', json(요청)),
  agents: (projectId?: number) => call<{ agents: PerfAgent[] }>(projectId === undefined ? '/perf/agents' : `/perf/agents?projectId=${String(projectId)}`),
  addAgent: (name: string, mode: 'LOAD' | 'MONITOR', projectId?: number) =>
    call<{ id: number; token: string; installCommand: string }>('/perf/agents', json({ name, mode, projectId })),
  editAgent: (id: number, 고침: { name?: string; maxVus?: number }) =>
    call<object>(`/perf/agents/${String(id)}`, { ...json(고침), method: 'PATCH' }),
  removeAgent: (id: number) => call<undefined>(`/perf/agents/${String(id)}`, { method: 'DELETE' }),
};
