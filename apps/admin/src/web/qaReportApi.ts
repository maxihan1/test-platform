// QA 리포트 화면이 서버를 부르는 호출 · 응답 모양 (도메인/리포팅 §7 「QA 리포트 통로」)

import { call } from './api.js';

export type 리포트종류 = 'FN' | 'UI' | 'E2E' | 'COMPAT' | 'PERF';

/** GET /api/qa-reports 의 한 줄 — 묶음(빌드 · 실행 하나 · 성능 실행 하나)마다 마지막 버전 */
export interface 리포트줄 {
  id: number;
  service: string;
  env: string;
  buildNo: string | null;
  runId: number | null;
  perfRunId: number | null;
  version: number;
  kinds: 리포트종류[];
  /** 묶음에서 아직 도는 실행 수 */
  running: number;
  /** 마지막 실행이 끝난 시각. 다 돌기 전이면 null */
  finishedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  updatedAt: string;
}

export interface 리포트조건 {
  env?: string;
  approved?: boolean;
  page?: number;
}

/** 한 쪽 줄 수 — 서버가 정한다(§7 「한 쪽 50줄」) */
export const 쪽크기 = 50;

export const qaReportApi = {
  list: (service: string, 조건: 리포트조건) => {
    const q = new URLSearchParams({ service });
    if (조건.env !== undefined) q.set('env', 조건.env);
    if (조건.approved !== undefined) q.set('approved', String(조건.approved));
    if (조건.page !== undefined && 조건.page > 1) q.set('page', String(조건.page));
    return call<{ items: 리포트줄[]; total: number }>(`/qa-reports?${q.toString()}`);
  },
};
