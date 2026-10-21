// 성능 시나리오 본문 · 실행 설정의 꼴 — 저장은 perf_scenario_version.body, 실행은 perf_run.config (도메인/성능 §3.9 · §7)

import type { 기기목표줄 } from './deviceStats.js';

export type TestType = 'LOAD' | 'STRESS' | 'SPIKE' | 'SOAK';

export interface Extract {
  var: string;
  where: 'JSON' | 'HEADER' | 'COOKIE';
  path: string;
  pick: 'FIRST' | 'RANDOM';
}

export interface Transaction {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // 대상 서버 주소 아래 경로(`/api/login`) 또는 API 서버 호스트의 절대 주소. ${변수} 를 쓸 수 있다
  url: string;
  headers?: Record<string, string>;
  body?: string;
  extract?: Extract[];
  check?: { status?: number[]; contains?: string };
  thinkTimeSec?: number;
}

export interface Stage {
  durationSec: number;
  target: number;
}

export interface Load {
  basis: 'VUS' | 'TPS';
  stages: Stage[];
}

export interface Target {
  metric: 'P95' | 'ERROR_RATE' | 'TPS';
  // 트랜잭션 이름. 비면 전체
  scope?: string;
  op: '<=' | '>=';
  value: number;
  source: 'PRD' | 'AI' | 'MANUAL';
  reqId?: string;
}

export interface ScenarioBody {
  transactions?: Transaction[];
  dummyClient?: number;
  load?: Load & { testType?: TestType };
  targets?: Target[];
  run?: Record<string, unknown>;
}

// 페이지 성능 — 잴 페이지 한 줄과 측정 조건 (§3.9 「페이지 성능」)
export interface Page {
  // 대상 서버 주소 아래 경로('/products/1')
  url: string;
  name: string;
  // 로그인 상태로 기록된 화면 — 로그인 화면을 거쳐 연다
  login: boolean;
}

export interface PageSetup {
  pages: Page[];
  device: 'desktop' | 'mobile';
  network: 'NONE' | 'SLOW_4G';
  // 화면 기록의 로그인 화면 경로. 로그인할 페이지가 없으면 null
  loginUrl: string | null;
}

// 페이지 단독 측정(kind PAGE)의 perf_run.config
export interface PageRunConfig extends PageSetup {
  agentIds: number[];
  monitorIds: number[];
  allowedHosts: string[];
  durationSec: number;
  targets: Target[];
}

export interface RunConfig {
  testType: TestType;
  load: Load;
  targets: Target[];
  agentIds: number[];
  monitorIds: number[];
  // 고른 대상 서버 주소의 호스트와 프로젝트 API 서버 호스트 (§3.9 「허용 호스트」) — WHATWG URL.host 꼴
  allowedHosts: string[];
  pageCheck: boolean;
  // 부하 중 페이지 측정이 켜졌을 때 잴 페이지 (§3.9 「부하 중 측정」)
  pages?: PageSetup;
  accountsRows: number;
  durationSec: number;
  maxVus: number;
}

// 기기 성능(kind DEVICE)의 perf_run.config (§7 「PERF-F1-08 이 연 통로」)
export interface DeviceRunConfig {
  drive: 'APPIUM' | 'MANUAL';
  caseIds: string[];
  durationSec: number;
  package: string;
  // launchMs 는 기록기가 앱 실행 시간을 잰 뒤에 채운다
  devices: { serial: string; where: 'FARM' | 'LOCAL'; model: string; launchMs: number | null }[];
  repeat: number;
  metrics: string[];
  intervalSec: 1 | 2 | 5;
  record: boolean;
  targets: 기기목표줄[];
  agentIds: number[];
  monitorIds: number[];
}
