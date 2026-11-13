// 정기 실행 화면이 서버를 부르는 호출 · 응답 모양 (도메인/정기실행 §7)

import { call, json } from './api.js';

export type 줄종류 = 'FN' | 'UI' | 'E2E' | 'COMPAT';
export type 회차판정 = 'PASS' | 'FAIL' | 'NONE';

/** 세트줄 (§7 GET /api/sched/sets) */
export interface 세트 {
  id: number;
  name: string;
  at: string;
  tz: string;
  /** 0(일) ~ 6(토). 한 번만이면 null 이고 onceOn 이 찬다 */
  days: number[] | null;
  onceOn: string | null;
  isOn: boolean;
  isBase: boolean;
  items: { kind: 줄종류; service: string; tcIds: string[] | null; scenarioId?: number; compatSetId?: number; label: string }[];
  envs: { service: string; env: string }[];
  skipped: { seq: number; reason: string }[];
  missing: { cases: number; tests: number };
  avgMinutes: number | null;
  last: { occurrenceId: number; state: 'RUNNING' | 'DONE'; plannedAt: string; startedAt: string | null; verdict: 회차판정; suspects: number; runIds: number[] } | null;
  baseable: boolean;
}

export interface 회차실행 {
  runId: number;
  kind: 'UI' | 'FN' | 'SCENARIO' | 'COMPAT';
  service: string;
  title: string;
  status: string;
  passed: number;
  failed: number;
  other: number;
  suspects?: number;
}

/** 달력 한 줄 (§7 GET /api/sched/calendar) */
export interface 회차 {
  id: number;
  setId: number;
  plannedOn: string;
  plannedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  state: 'QUEUED' | 'RUNNING' | 'DONE' | 'SKIPPED';
  verdict: 회차판정;
  suspects: number;
  runs: 회차실행[];
  notes: { kind: string | null; service: string | null; reason: string }[];
}

export const schedApi = {
  sets: (projectId: number) => call<{ items: 세트[] }>(`/sched/sets?projectId=${String(projectId)}`),
  calendar: (projectId: number, from: string, to: string) =>
    call<{ occurrences: 회차[] }>(`/sched/calendar?projectId=${String(projectId)}&from=${from}&to=${to}`),
  setOn: (id: number, isOn: boolean) =>
    call<unknown>(`/sched/sets/${String(id)}`, { ...json({ isOn }), method: 'PATCH' }),
};
