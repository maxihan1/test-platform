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

export const stabilityApi = {
  main: (serviceId: number, run: number | null, days: 7 | 30) =>
    call<안정화응답>(`/stability?service=${String(serviceId)}${run === null ? '' : `&run=${String(run)}`}&days=${String(days)}`),
};
