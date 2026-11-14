// QA 리포트 화면이 서버를 부르는 호출 · 응답 모양 (도메인/리포팅 §7 「QA 리포트 통로」)

import type { 프로젝트리포트응답 } from '../reporting/qaProjectReportShape.js';
import type { 리포트응답 } from '../reporting/qaReportDoc.js';
import { call, json } from './api.js';
import type { 값들 } from './i18n.js';

export type { 리포트응답, 프로젝트리포트응답 };

/** GET /api/qa-project-reports 의 한 줄 */
export interface 프로젝트리포트줄 {
  id: number;
  from: string;
  to: string;
  origin: 'MANUAL' | 'SCHEDULED';
  createdBy: string;
  createdAt: string;
}
export type 리포트형식 = 'PDF' | 'HTML' | 'DOCX';

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
  /** 묶음에서 끝난 실행 가운데 마지막 시각. 아직 도는 실행이 있어도 하나라도 끝났으면 차 있다 — 끝난 실행이 없을 때만 null. 다 끝났는지는 running 으로 본다 */
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

/** 줄 이름 — 빌드 번호, 빌드 없는 실행 하나면 `RUN 812`, 성능 실행 하나면 성능 실행 화면의 `PRF-0012` 꼴 (§8.21 「애플리케이션 탭」) */
export function 리포트이름(줄: Pick<리포트줄, 'buildNo' | 'runId' | 'perfRunId'>, t: (키: string, 값?: 값들) => string): string {
  if (줄.buildNo !== null) return t('빌드 {빌드}', { 빌드: 줄.buildNo });
  if (줄.runId !== null) return `RUN ${String(줄.runId)}`;
  return `PRF-${String(줄.perfRunId ?? 0).padStart(4, '0')}`;
}

export const qaReportApi = {
  list: (service: string, 조건: 리포트조건) => {
    const q = new URLSearchParams({ service });
    if (조건.env !== undefined) q.set('env', 조건.env);
    if (조건.approved !== undefined) q.set('approved', String(조건.approved));
    if (조건.page !== undefined && 조건.page > 1) q.set('page', String(조건.page));
    return call<{ items: 리포트줄[]; total: number }>(`/qa-reports?${q.toString()}`);
  },
  get: (id: number) => call<리포트응답>(`/qa-reports/${String(id)}`),
  approve: (id: number) => call<{ approval: 리포트응답['approval'] }>(`/qa-reports/${String(id)}/approve`, { method: 'POST' }),
  saveAi: (id: number, text: string) => call<{ ai: 리포트응답['ai'] }>(`/qa-reports/${String(id)}/ai`, { ...json({ text }), method: 'PATCH' }),
  projectList: (projectId: number, page: number) =>
    call<{ items: 프로젝트리포트줄[]; total: number }>(`/qa-project-reports?projectId=${String(projectId)}${page > 1 ? `&page=${String(page)}` : ''}`),
  projectCreate: (projectId: number, from: string, to: string, tz: string) =>
    call<{ id: number }>('/qa-project-reports', { ...json({ projectId, from, to, tz }), method: 'POST' }),
  projectGet: (id: number) => call<프로젝트리포트응답>(`/qa-project-reports/${String(id)}`),
  projectSaveAi: (id: number, text: string) => call<{ ai: 프로젝트리포트응답['ai'] }>(`/qa-project-reports/${String(id)}/ai`, { ...json({ text }), method: 'PATCH' }),
  /** 이 실행이 든 리포트의 마지막 버전 — 아직 어느 리포트에도 안 들었으면 404 */
  ofRun: (runId: number) => call<{ id: number }>(`/runs/${String(runId)}/qa-report`),
};

/** 내려받기 · 화면 안 문서 주소. 엑셀은 통로가 아직 400 이라 형식에 없다 (§7 「QA 리포트 통로」) */
export const 리포트파일주소 = (id: number, 형식: 리포트형식): string => `/api/qa-reports/${String(id)}/file?format=${형식}`;

/** 프로젝트 리포트 파일 — 엑셀은 없다(PDF · 워드, 화면 안 보기는 HTML) (§3.17 「내는 형식」) */
export const 프로젝트파일주소 = (id: number, 형식: 리포트형식): string => `/api/qa-project-reports/${String(id)}/file?format=${형식}`;
