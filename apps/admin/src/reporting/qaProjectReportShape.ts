// 프로젝트 QA 리포트의 굳힌 숫자(body) 꼴과 날짜 셈 — 서버 모으기 · 문서 · 화면이 같이 쓰는 순수 함수 (도메인/리포팅 §3.17 「프로젝트 QA 리포트 — 기간 상태」 · §7)
// 화면이 이 파일을 부른다 — zod · DB 를 끌어오는 모듈을 import 하지 않는다

import { 날짜더하기 } from './day.js';
import type { 리스크글저장 } from './qaReportAi.js';

export { 날짜더하기 };

/** 기간 상한 — 양 끝을 넣어 92일(DB CHECK 와 같다) */
export const 기간상한 = 92;

export interface 판정수 {
  pass: number;
  fail: number;
  notRun: number;
}

type 결과줄 = { kind: string; quality?: string; result: Record<string, unknown> | null };

/** 리포트 하나를 가리키는 고리 — 부록 · 애플리케이션 줄이 같이 쓴다 */
export interface 앱리포트고리 {
  id: number;
  buildNo: string | null;
  runId: number | null;
  perfRunId: number | null;
  version: number;
  approved: boolean;
}

export interface 앱줄 {
  serviceId: number;
  prefix: string;
  name: string;
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  /** 기간 안 기능 · UI 케이스 판정(대시보드 「애플리케이션별」과 같은 셈) */
  runs: 판정수;
  /** 기간 안 회귀 실패 · 해결 — 대시보드와 같은 셈 */
  newFailures: number;
  resolved: number;
  /** 기간 안 애플리케이션 리포트의 빌드 번호 — 처음 실행 시각 차례 */
  builds: string[];
  reports: number;
  unapproved: number;
  /** 기간 안 마지막 애플리케이션 리포트와 그 첫 장 결과 요약(기능 검증 · 비기능 검증) — 리포트가 센 숫자를 그대로 옮긴다 */
  last: (앱리포트고리 & { results: { functional: 결과줄[]; nonFunctional: 결과줄[] } }) | null;
  /** 기간 끝에 열린 결함(Issue Bunker 이슈) — 미연결이면 null */
  openDefects: number | null;
}

export interface 성능점 {
  runId: number;
  day: string;
  kind: 'LOAD' | 'PAGE' | 'DEVICE';
  /** 성능 목표 통과 · 미달 수 */
  pass: number;
  fail: number;
}

export interface 안정화점 {
  day: string;
  passErrorCases: number;
  cases: number;
  /** 웹은 칸이 없어 null */
  crashes: number | null;
  residual: number;
}

export interface 비기능줄 {
  serviceId: number;
  name: string;
  kind: 앱줄['kind'];
  perf: 성능점[];
  /** API 애플리케이션 · 기간 안 집계가 없으면 null */
  stab: { days: 안정화점[]; newErrors: number; reopened: number; confirmed: number } | null;
}

export interface 커버리지점 {
  at: string;
  cased: number;
  total: number;
}

export interface 정기세트줄 {
  name: string;
  at: string;
  tz: string;
  days: number[] | null;
  onceOn: string | null;
  /** 다음 기간에 설 회차 수 */
  runs: number;
}

export interface 프로젝트몸 {
  project: { id: number; name: string };
  period: { from: string; to: string; tz: string; days: number };
  btsLinked: boolean;
  apps: 앱줄[];
  /** 기간 안 기능 · UI 판정 — 대시보드 통과율 · 일별과 같은 셈. previous 는 바로 앞 같은 길이 기간 */
  passRate: { current: 판정수; previous: 판정수 };
  daily: ({ day: string } & 판정수)[];
  /** Issue Bunker 배포 신호. 미연결이면 null */
  deploys: { count: number; rollbacks: number; items: { buildNo: string; at: string; rollback: boolean }[] } | null;
  /** 기간 안 배포에 든 이슈 가운데 QA 확인(「QA 요청」을 떠남)이 끝난 수. 미연결이면 null */
  changes: { issues: number; confirmed: number } | null;
  /** 요구사항 커버리지 — 기간 시작 때 값(start)과 기간 안 작성 완료마다 한 점 */
  coverage: { serviceId: number; name: string; start: 커버리지점 | null; points: 커버리지점[] }[];
  /** 결함 추이 — 날마다 그날 끝에 열린 이슈 수. 미연결이면 null */
  defects: { opened: number; closed: number; days: { day: string; open: number }[] } | null;
  nonFunctional: 비기능줄[];
  /** 진행을 막은 것 — 0 인 애플리케이션은 안 싣는다 */
  blocked: { serviceId: number; name: string; aborted: number; prepFailed: number; perfErrors: number }[];
  upcoming: { from: string; to: string; sets: 정기세트줄[] };
  appendix: { serviceId: number; name: string; reports: 앱리포트고리[] }[];
  /** 견준 지난 프로젝트 리포트 */
  previous: { id: number; from: string; to: string } | null;
}

/** GET /api/qa-project-reports/:id 응답 */
export interface 프로젝트리포트응답 {
  id: number;
  projectId: number | null;
  projectName: string;
  from: string;
  to: string;
  tz: string;
  origin: 'MANUAL' | 'SCHEDULED';
  body: 프로젝트몸;
  ai: 리스크글저장 | { failed: true } | null;
  createdBy: string;
  createdAt: string;
}

/** 'YYYY-MM-DD' → 「11/14」 — 문서와 화면이 같이 쓴다 */
export const 짧은날 = (d: string): string => `${String(Number(d.slice(5, 7)))}/${String(Number(d.slice(8, 10)))}`;

const 날짜꼴 = /^\d{4}-\d{2}-\d{2}$/;
const 날짜인가 = (d: string): boolean => 날짜꼴.test(d) && 날짜더하기(d, 0) === d;

/** 양 끝을 넣은 날 수 */
export const 날수 = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** 기간이 받을 만한가 — 틀렸으면 까닭(400 detail) */
export function 기간까닭(from: string, to: string, 오늘: string): string | null {
  if (!날짜인가(from) || !날짜인가(to)) return '기간은 YYYY-MM-DD 날짜입니다';
  if (from > to) return '시작일이 종료일보다 늦습니다';
  if (to > 오늘) return '종료일은 오늘까지입니다';
  if (날수(from, to) > 기간상한) return `기간은 ${String(기간상한)}일까지입니다`;
  return null;
}

/** 다음 기간 — 같은 길이로 바로 뒤 */
export const 다음기간 = (from: string, to: string): { from: string; to: string } => ({ from: 날짜더하기(to, 1), to: 날짜더하기(to, 날수(from, to)) });

/** 요일(0 일 ~ 6 토) — 날짜 글자만 보고 센다 */
const 요일 = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay();

/** 세트 하나가 기간 안에 설 회차 수 — 한 번만 도는 세트는 그날이 들면 1 */
export function 회차수(세트: { days: number[] | null; onceOn: string | null }, from: string, to: string): number {
  if (세트.onceOn !== null) return 세트.onceOn >= from && 세트.onceOn <= to ? 1 : 0;
  const 요일들 = new Set(세트.days ?? []);
  let n = 0;
  for (let d = from; d <= to; d = 날짜더하기(d, 1)) if (요일들.has(요일(d))) n += 1;
  return n;
}

/** 만들기 창의 빠른 기간 — 이번 주는 월요일부터 오늘, 이번 달은 1일부터 오늘 */
export function 빠른기간(오늘: string, 꼴: 'week' | 'month'): { from: string; to: string } {
  if (꼴 === 'month') return { from: `${오늘.slice(0, 8)}01`, to: 오늘 };
  return { from: 날짜더하기(오늘, -((요일(오늘) + 6) % 7)), to: 오늘 };
}
