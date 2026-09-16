// Admin API 호출 한 곳 (SPEC §7). 응답 모양은 WS-A·WS-B가 실제로 내보내는 것을 그대로 옮겼다
// 목 데이터는 두지 않는다 — 개발 서버도 /api를 진짜 admin으로 프록시한다 (vite.config.ts)

import type { ItemStatus, JsonSchema, Platform, StepResult } from '@platform/kit';

export type { ItemStatus, JsonSchema, Platform, StepResult };

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CaseRow {
  tcId: string;
  name: string;
  platforms: Platform[];
  precondition: string[];
  filePath: string;
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
  isActive: boolean;
  scannedAt: string;
}

export interface LastScan {
  scannedAt: string;
  added: number;
  updated: number;
  deactivated: number;
  duplicates: { tcId: string; files: [string, string] }[];
  error?: string;
}

export interface LastResult {
  tcId: string;
  platform: Platform;
  status: ItemStatus;
  historyId: number;
  runId: number;
  durationMs: number | null;
  finishedAt: string;
}

export interface RunSummary {
  runId: number;
  title: string;
  triggeredBy: string;
  env: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  counts: { total: number; pass: number; fail: number; na: number; running: number };
}

export interface RunItemSummary {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  status: ItemStatus;
  durationMs: number | null;
  error: { message: string; stack?: string } | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunItemDetail extends RunItemSummary {
  runId: number;
  runTitle: string;
  precondition: string[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  steps: StepResult[];
}

export interface ParamSetRow {
  id: number;
  tcId: string;
  name: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  createdAt: string;
}

export interface Violation {
  path: string;
  message: string;
}

export interface SourceExcerpt {
  lines: { no: number; text: string }[];
  focus: number;
}

export interface RunRequestItem {
  tcId: string;
  platforms: Platform[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs?: number;
}

// 서버가 칸별 사유를 돌려준 것(400 INVALID_PARAMS)과 진짜 고장을 갈라야
// 화면이 오류를 칸 아래에 붙일지 위에 붙일지 정할 수 있다 (SPEC §8.2)
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly violations: Violation[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: string;
  detail?: string;
  message?: string;
  violations?: Violation[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // 본문이 JSON이 아니면 상태 코드만으로 알린다
    }
    throw new ApiError(
      res.status,
      body.error ?? String(res.status),
      body.detail ?? body.message ?? `요청이 실패했다 (${res.status})`,
      body.violations ?? [],
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  cases: (q: string, page: number) =>
    call<Paged<CaseRow>>(`/catalog/cases?q=${encodeURIComponent(q)}&page=${page}`),

  caseOf: (tcId: string) => call<CaseRow>(`/catalog/cases/${encodeURIComponent(tcId)}`),

  lastScan: () => call<LastScan | null>('/catalog/scan'),

  rescan: () => call<LastScan>('/catalog/scan', { method: 'POST' }),

  source: (tcId: string, line: number) =>
    call<SourceExcerpt>(`/cases/${encodeURIComponent(tcId)}/source?line=${line}`),

  lastByCase: () => call<{ items: LastResult[] }>('/runs/last-by-case'),

  runs: (page: number) => call<Paged<RunSummary>>(`/runs?page=${page}`),

  run: (runId: number) => call<RunSummary & { items: RunItemSummary[] }>(`/runs/${runId}`),

  item: (runId: number, historyId: number) => call<RunItemDetail>(`/runs/${runId}/items/${historyId}`),

  createRun: (body: { title: string; triggeredBy?: string; items: RunRequestItem[] }) =>
    call<{ runId: number }>('/runs', json(body)),

  paramSets: (tcId: string) => call<{ items: ParamSetRow[] }>(`/cases/${encodeURIComponent(tcId)}/param-sets`),

  saveParamSet: (tcId: string, body: { name: string; params: Record<string, unknown>; expected: Record<string, unknown> }) =>
    call<ParamSetRow>(`/cases/${encodeURIComponent(tcId)}/param-sets`, json(body)),

  deleteParamSet: (id: number) => call<void>(`/param-sets/${id}`, { method: 'DELETE' }),

  screenshot: (runId: number, historyId: number, seq: number) => `/api/screenshots/${runId}/${historyId}/${seq}.png`,
};
