// E2E 시나리오 화면이 서버를 부르는 호출 모음. 응답 모양은 admin 의 scenario/ · execution/ 통로가 내보내는 것을 그대로 옮겼다

import type { ScenarioCleanup, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';

import {
  call,
  json,
  type ItemStatus,
  type JsonSchema,
  type Paged,
  type Platform,
  type RunSummary,
  type RunTally,
  type StepResult,
} from './api.js';

export interface ScenarioRow {
  id: number;
  name: string;
  platform: Platform;
  version: number;
  partCount: number;
  isActive: boolean;
  needsCheck: boolean;
  runnable: boolean;
  lastRun: {
    runId: number;
    status: string;
    verdict: ItemStatus | null;
    finishedAt: string | null;
    unconfirmed: boolean;
  } | null;
}

export interface ScenarioDetail {
  id: number;
  service: string;
  name: string;
  platform: Platform;
  version: number;
  parts: ScenarioPart[];
  isActive: boolean;
  versions: { version: number; savedBy: string; savedByName: string; savedAt: string }[];
  checks: { seq: number; reason: 'STEP_GONE' | 'CASE_INACTIVE' }[];
}

export interface ScenarioVersionBody {
  platform: Platform;
  parts: ScenarioPart[];
}

export interface CasePartMaterial {
  tcId: string;
  name: string;
  platforms: Platform[];
  precondition: string[];
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
  steps: { title: string; skippable: boolean }[];
  r16: boolean;
  unconfirmed: string | null;
}

export interface ScenarioRunPart {
  seq: number;
  kind: ScenarioPart['kind'];
  tcId: string | null;
  tcName: string | null;
  part: ScenarioPart;
  status: ItemStatus;
  durationMs: number | null;
  skippedSteps: string[];
  mocks: string[];
  paramSchema: JsonSchema | null;
  expectedSchema: JsonSchema | null;
  precondition: string[];
  unconfirmed: string | null;
  bound: Record<string, unknown>;
  cleanup: Omit<ScenarioCleanup, 'fromSeq'>[];
  steps: StepResult[];
  error: { message: string; stack?: string } | null;
}

export interface ScenarioRunResult {
  scenarioId: number;
  version: number;
  status: string;
  platform: Platform;
  title: string;
  env: string;
  baseUrl: string;
  triggeredBy: string;
  triggeredByName: string | null;
  startedAt: string;
  finishedAt: string | null;
  parts: ScenarioRunPart[];
}

export type TrialState = { status: 'RUNNING' } | { status: 'FINISHED'; result: ScenarioExecuteResponse };

export type ScenarioRunRow = Omit<RunSummary, 'counts'> & {
  scenarioId: number;
  version: number;
  partCount: number;
  stoppedAt: number | null;
  unconfirmed: boolean;
  verdict: ItemStatus | null;
};

export type ScenarioRunList = Paged<ScenarioRunRow> & { summary: RunTally & { unconfirmedPass: number } };

interface TrialBody {
  service: string;
  env: string;
  platform: Platform;
  parts: ScenarioPart[];
}

export const scenarioApi = {
  list: (service: string, uses?: string[]) => {
    const params = new URLSearchParams({ service });
    if (uses !== undefined && uses.length > 0) params.set('uses', uses.join(','));
    return call<{ items: ScenarioRow[] }>(`/scenarios?${params.toString()}`);
  },

  detail: (id: number) => call<ScenarioDetail>(`/scenarios/${id}`),

  version: (id: number, v: number) => call<ScenarioVersionBody>(`/scenarios/${id}/versions/${v}`),

  create: (body: { service: string; name: string; platform: Platform; parts: ScenarioPart[] }) =>
    call<{ id: number; version: number }>('/scenarios', json(body)),

  update: (id: number, body: { name: string; platform: Platform; parts: ScenarioPart[]; baseVersion: number }) =>
    call<{ version: number }>(`/scenarios/${id}`, { ...json(body), method: 'PUT' }),

  restore: (id: number, version: number) =>
    call<{ version: number }>(`/scenarios/${id}/restore`, json({ version })),

  caseParts: (tcId: string) => call<CasePartMaterial>(`/scenarios/case-parts/${encodeURIComponent(tcId)}`),

  run: (id: number, env: string) => call<{ runId: number }>(`/scenarios/${id}/runs`, json({ env })),

  result: (runId: number) => call<ScenarioRunResult>(`/runs/${runId}/scenario`),

  startTrial: (body: TrialBody) => call<{ trialId: string }>('/scenario-trials', json(body)),

  trial: (trialId: string) => call<TrialState>(`/scenario-trials/${encodeURIComponent(trialId)}`),

  // 사진은 <img src> 가 직접 부른다. 글자만 돌려준다
  runShot: (runId: number, seq: number) => `/api/runs/${runId}/scenario/screenshots/${seq}`,

  trialShot: (trialId: string, seq: number) => `/api/scenario-trials/${encodeURIComponent(trialId)}/screenshots/${seq}`,

  runs: (service: string, page: number, 조건: { q?: string; state?: 'running' | 'failed' } = {}) => {
    const params = new URLSearchParams({ service, page: String(page), kind: 'scenario' });
    if (조건.q !== undefined && 조건.q !== '') params.set('q', 조건.q);
    if (조건.state !== undefined) params.set('state', 조건.state);
    return call<ScenarioRunList>(`/runs?${params.toString()}`);
  },
};
