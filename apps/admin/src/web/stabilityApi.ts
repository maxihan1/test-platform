// 안정화 지표 화면이 서버를 부르는 호출 · 응답 모양 (도메인/안정화 §7 GET /api/stability)

import { call } from './api.js';

/** 오류 종류가 그 실행에서 받은 상태 — 신규 · 증가 · 재발 · 기존 (§3.15 「상태」) */
export type 오류상태 = 'NEW' | 'UP' | 'REOPENED' | 'ONGOING';

export interface 집계실행 {
  runId: number;
  /** 그 묶음의 실행 번호(UI 실행 · 기능 실행, 앞 실행부터) */
  runIds: number[];
  day: string;
  env: string;
  buildNo: string | null;
  cases: number;
  errorCases: number;
  passErrorCases: number;
  /** 웹은 null */
  crashes: number | null;
  residual: number;
  newErrors: number;
  resolved: number;
  confirmed: number;
  previous: { runId: number; day: string; errorCases: number; residual: number; crashes: number | null } | null;
}

/** DONE 이 아니면 status 만 차고 나머지는 null 이다 */
export interface 실행요약 {
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  headline: string | null;
  changes: { errorId: number; state: 오류상태; text: string }[] | null;
  features: { name: string; errorCases: number }[] | null;
  verified: string | null;
  trend: string | null;
  finishedAt: string | null;
}

export interface 추이점 {
  day: string;
  runId: number;
  residual: number;
  newErrors: number;
  buildNo: string | null;
  buildChanged: boolean;
}

export interface 오류줄 {
  id: number;
  title: string;
  state: 오류상태;
  cases: number;
  previousCases: number;
  firstDay: string;
  firstBuildNo: string | null;
  tcIds: string[];
}

export interface 안정화응답 {
  schedule: { at: string; tz: string } | null;
  runs: { runId: number; day: string }[];
  run: 집계실행 | null;
  summary: 실행요약 | null;
  trend: 추이점[];
  errors: 오류줄[];
}

/** 상세의 Issue Bunker 칸 — 보내는 중 · 포기(다시 누름) · 올림(키 · 링크). 연결을 끊었으면 url 이 null */
export type 이슈칸 = { state: 'PENDING' } | { state: 'GAVE_UP'; reason: string | null } | { key: string; url: string | null } | null;

/** GET /api/stability/errors/:id — 오류 종류 하나를 그 실행에서 본 것 (§7) */
export interface 오류상세 {
  id: number;
  title: string;
  message: string | null;
  source: string;
  state: 오류상태;
  runId: number;
  firstRunId: number;
  firstDay: string;
  firstBuildNo: string | null;
  resolvedAt: string | null;
  confirmedRunId: number | null;
  issue: 이슈칸;
  btsLinked: boolean;
  ai: { headline: string; impact: string; previous: string; cause: string; runId: number } | null;
  kpis: { cases: number; runCases: number; passCases: number; crashCases: number; firstCrashTcId: string | null; hits: number; previousHits: number };
  occurrences: { tcId: string; name: string; status: string; seq: number | null; crash: boolean; historyId: number; runId: number | null }[];
  samples: { text: string; page: string | null; device: string | null; runId: number; tcId: string; at: string }[];
  trend: { day: string; cases: number }[];
  devices: { name: string; os: string | null; cases: number }[];
}

export const stabilityApi = {
  main: (serviceId: number, run: number | null, days: 7 | 30) =>
    call<안정화응답>(`/stability?service=${String(serviceId)}${run === null ? '' : `&run=${String(run)}`}&days=${String(days)}`),
  error: (id: number, run: number | undefined) => call<오류상세>(`/stability/errors/${String(id)}${run === undefined ? '' : `?run=${String(run)}`}`),
  resolve: (id: number) => call<void>(`/stability/errors/${String(id)}/resolve`, { method: 'POST' }),
  issue: (id: number) => call<{ state: 'PENDING' }>(`/stability/errors/${String(id)}/issue`, { method: 'POST' }),
};
