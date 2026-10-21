// 성능 테스트 › 페이지 성능 화면이 서버를 부르는 호출 · 응답 모양 (도메인/성능 §3.9 「페이지 성능」 · §7)
// perfApi.ts 가 300줄을 넘지 않게 따로 뒀다. 화면은 `perfApi.measure` 처럼 perfApi 로 부른다

import { call, json } from './api.js';
import type { 실행줄 } from './perfApi.js';

/** 페이지 성능 — 잴 페이지 하나. url 은 `/` 로 시작하는 경로다 (도메인/성능 §3.9 「페이지 성능」) */
export interface 측정페이지 {
  url: string;
  name: string;
  login: boolean;
}

export type 페이지기기 = 'desktop' | 'mobile';
export type 페이지망 = 'NONE' | 'SLOW_4G';

export interface 리소스 {
  name: string;
  type: 'document' | 'script' | 'css' | 'img' | 'api' | 'font' | 'other';
  startMs: number;
  durationMs: number;
  bytes: number;
}

/** 단독 측정은 sec · vus 가 null, 부하 중 측정은 그때의 초 · 가상 사용자다 */
export interface PageRow {
  url: string;
  name: string;
  sec: number | null;
  vus: number | null;
  device: 페이지기기;
  network: 페이지망;
  lcpMs: number | null;
  fcpMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  lcpElement: string | null;
  resources: 리소스[];
  ai: string[] | null;
  verdict: 'PASS' | 'FAIL' | null;
}

/** PAGE 실행이면 같은 대상 서버의 가장 최근 부하 실행, LOAD 실행이면 가장 최근 끝난 단독 측정 */
export interface Compare {
  runId: number;
  code: string;
  kind: 'LOAD' | 'PAGE';
  vus: number | null;
  pages: { url: string; lcpMs: number | null }[];
}

export interface 페이지측정요청 {
  serviceId: number;
  env: string;
  pages: 측정페이지[];
  device: 페이지기기;
  network: 페이지망;
}

export interface 페이지추천 {
  pages: (측정페이지 & { why: string })[];
  basis: string[];
}

export const 페이지호출 = {
  // PAGE 실행 목록. 줄의 title 은 빈 글이다 — 화면이 「페이지 성능」을 대신 적는다
  pagesRuns: (serviceId: number) => call<{ runs: 실행줄[] }>(`/perf/runs?serviceId=${String(serviceId)}&kind=PAGE`),
  measure: (요청: 페이지측정요청) => call<{ runId: number }>('/perf/pages/measure', json(요청)),
  pages: (id: number) => call<{ pages: PageRow[]; compare: Compare | null }>(`/perf/runs/${String(id)}/pages`),
  // 화면 기록이 없으면 409 NO_DATA — 화면이 메인 한 페이지로 대신한다
  suggestPages: (serviceId: number, env?: string) => call<{ jobId: number }>('/perf/suggest', json({ serviceId, kind: 'PAGES', env })),
};
