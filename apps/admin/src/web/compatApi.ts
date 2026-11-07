// 호환성 화면이 서버를 부르는 호출 모음. 응답 모양은 admin compat/routes.ts 통로를 그대로 옮겼다 (도메인/호환성 §7)

import { call, json, type Paged, type RunSummary } from './api.js';

/** 세트에 저장한 디바이스 사본. name 은 기종명이고 없으면 모델이다 */
export interface CompatSetDevice {
  serial: string;
  model: string;
  name: string;
}

export interface CompatCoverage {
  covered: number;
  total: number;
  /** 전체 화면 목록이 없어 케이스가 아는 화면으로 셌는지 */
  fallback: boolean;
}

export interface CompatSetRow {
  id: number;
  name: string;
  onePerModel: boolean;
  devices: CompatSetDevice[];
  addedCases: string[];
  coverage: CompatCoverage;
  lastRun: { runId: number; startedAt: string; state: string; confirmed: number; pending: number; unchecked: number } | null;
}

export interface CompatAuto {
  tcId: string;
  name: string;
  adds: number;
}

export interface CompatScreen {
  key: string;
  name: string;
}

export interface CompatSetDetail extends CompatSetRow {
  auto: CompatAuto[];
  uncovered: CompatScreen[];
  estimate: { runs: number; testMinutes: number; checkMinutes: number };
}

export interface CompatPreview {
  auto: CompatAuto[];
  coverage: CompatCoverage;
  uncovered: CompatScreen[];
}

export type 디바이스상태 = 'IDLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE';

/** 팜 폰 한 대. ? 칸은 비전이 못 읽었으면 없다 (비전 안내서 11절) */
export interface CompatDevice {
  serial: string;
  model: string;
  manufacturer: string;
  os: string;
  resolution: string;
  state: 디바이스상태;
  marketName?: string;
  density?: number;
  inches?: number;
  formFactor?: 'phone' | 'foldable' | 'tablet';
  displays?: { size: string; inches: number }[];
  fold?: 'unfolded' | 'folded';
}

export interface CompatSetBody {
  serviceId: number;
  name: string;
  onePerModel: boolean;
  devices: { serial: string }[];
  addedCases: string[];
}

/** 실행의 점검 상태 하나 — 폴더블은 상태마다 한 줄이다 (§7 「결과」) */
export interface CompatRunDevice {
  seq: number;
  /** 실제로 돈 폰 — 모델별 1대로 바꿔 잡았으면 고른 것과 다르다 */
  serial: string;
  model: string;
  name: string;
  os: string | null;
  fold: 'OPEN' | 'FOLDED' | null;
  state: 'WAIT' | 'RUNNING' | 'CHECKING' | 'DONE' | 'SKIPPED' | 'STOPPED';
  cases: { done: number; total: number };
  checks: { done: number; total: number };
  skipReason: string | null;
  now: { tcId: string; name: string; startedAt: string | null } | null;
  vision: string | null;
}

export type 칸값 = 'OK' | 'PENDING' | 'CONFIRMED' | 'NOT_DEFECT' | 'UNCHECKED';

/** 비전 의심 하나. box 는 원본 픽셀 [x, y, 가로, 세로] 근사값이다 (비전 안내서) */
export interface CompatIssue {
  kind: string;
  box: number[];
  note: string;
}

export interface CompatCard {
  key: string;
  seq: number;
  screenId: number;
  tcId: string;
  step: number | null;
  issues: CompatIssue[];
  verdict: 'CONFIRMED' | 'NOT_DEFECT' | null;
  judgedBy: string | null;
  judgedAt: string | null;
}

export interface CompatRow {
  key: string;
  name: string;
  cells: { seq: number; value: 칸값; reason?: string }[];
}

export interface CompatRunResult {
  run: { runId: number; setId: number; title: string; env: string; buildNo: string | null; startedAt: string; finishedAt: string | null; state: string; startedBy: string };
  devices: CompatRunDevice[];
  counts: { screens: number; devices: number; states: number; confirmed: number; pending: number; notDefect: number; unchecked: number };
  rows: CompatRow[];
  hiddenOk: number;
  cards: CompatCard[];
  uncovered: CompatScreen[];
}

/** 실행 기록 › 호환성 한 줄. 통과 · 실패 수(counts)는 없다 — 결과에 안 넣는다 (결정 1) */
export type CompatRunRow = Omit<RunSummary, 'counts'> & {
  compat: { setName: string; devices: number; screens: number; confirmed: number; pending: number; affected: { states: number; total: number }; unchecked: number; stopReason: string | null };
};

export const compatApi = {
  sets: (serviceId: number) => call<{ sets: CompatSetRow[] }>(`/compat-sets?serviceId=${String(serviceId)}`),
  set: (id: number) => call<CompatSetDetail>(`/compat-sets/${String(id)}`),
  /** 케이스를 더하거나 뺄 때 저장 전에 다시 센다. 저장하지 않는다 */
  preview: (serviceId: number, addedCases: string[]) => call<CompatPreview>('/compat-sets/preview', json({ serviceId, addedCases })),
  create: (body: CompatSetBody) => call<{ id: number }>('/compat-sets', json(body)),
  update: (id: number, body: CompatSetBody) => call<{ id: number }>(`/compat-sets/${String(id)}`, { ...json(body), method: 'PUT' }),
  devices: () => call<{ devices: CompatDevice[] }>('/compat-devices'),
  start: (setId: number, env: string) => call<{ runId: number }>(`/compat-sets/${String(setId)}/runs`, json({ env })),
  run: (runId: number) => call<CompatRunResult>(`/compat-runs/${String(runId)}`),
  /** null 은 미판정으로 되돌린다 */
  verdict: (runId: number, key: string, seq: number, verdict: 'CONFIRMED' | 'NOT_DEFECT' | null) =>
    call<unknown>(`/compat-runs/${String(runId)}/verdicts`, { ...json({ key, seq, verdict }), method: 'PUT' }),
  runs: (service: string, page: number, q: string) => {
    const params = new URLSearchParams({ service, page: String(page), kind: 'compat' });
    if (q !== '') params.set('q', q);
    return call<Paged<CompatRunRow>>(`/runs?${params.toString()}`);
  },
};

/** 의심 화면 그림. 쿠키로 가니 img 에 그대로 건다 */
export const 그림주소 = (runId: number, screenId: number) => `/api/compat-runs/${String(runId)}/screens/${String(screenId)}/image`;
