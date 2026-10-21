// 도는 성능 실행의 메모리 상태 — 엔진(engine.ts)과 끝내기(finish.ts)가 같이 본다

import type { 페이지표본 } from './pageStats.js';
// ponytail: 도는 실행의 일 · 스모크 셈 · 연락 시각은 admin 메모리에 둔다. admin 이 다시 켜지면 돌던 실행은 ERROR 다(「admin 이 고장 났다」 줄) — 여러 admin 이 뜨면 DB 로 옮긴다

export interface Job {
  runId: number;
  kind: 'SMOKE' | 'LOAD' | 'PAGE' | 'MONITOR';
  startAt: string;
  script: string | null;
  segment?: string;
  segmentSequence?: string;
  env: Record<string, string>;
  accountsCsv?: string;
  allowedHosts: string[];
  durationSec: number;
}

export interface 도는실행 {
  runId: number;
  // 페이지 단독 측정은 스모크 · 자동 중단이 없다
  kind: 'LOAD' | 'PAGE';
  phase: 'SMOKE' | 'RUNNING';
  startAt: number;
  durationSec: number;
  agents: number[];
  monitors: number[];
  pending: Map<number, Job>;
  // 일을 받아 가 돌리는 중인 에이전트의 마지막 1초 숫자 시각(처음은 startAt). 돌리는 동안은 1초 숫자만 연락이다 (§3.9 「자동 중단」)
  heard: Map<number, number>;
  done: Map<number, 'OK' | 'ERROR'>;
  smoke: { requests: number; errors: number };
  checkedSec: number;
  lostMonitors: Set<number>;
  errorLogged: boolean;
  ending: boolean;
  // 단독 측정의 표본 — 끝날 때 가운데 값으로 줄인다. admin 이 다시 켜지면 그 실행은 어차피 ERROR 다
  pageSamples: 페이지표본[];
  // 부하 중 페이지 측정의 에이전트마다 브라우저 수 — 1초 숫자의 가상 사용자에서 뺀다
  browserVus: Map<number, number>;
}

// 일을 받고 시작까지 두는 틈 — 에이전트가 2초마다 claim 하니 모두가 받아 갈 시간이다
export const 시작틈초 = 5;
// 에이전트는 2초를 기다려 그 초를 보낸다(§5.4). 왕복까지 넉넉히 두고 그 초를 끝난 것으로 본다
export const 끝난초여유 = 4;

export const 도는것 = new Map<number, 도는실행>();

export function 도는실행들(): ReadonlyMap<number, 도는실행> {
  return 도는것;
}
