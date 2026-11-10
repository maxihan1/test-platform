// 대시보드 프로젝트 요약(project)의 숫자를 재료에서 만드는 순수 함수 — 요구사항 추적 · 케이스 · 마지막 결과 · E2E (도메인/리포팅 §8.12 「프로젝트 요약」)

import type { ItemStatus, Platform, PrdItem } from '@platform/kit/types';

import { 요구판정, 추적하기, 케이스판정, type 덮는케이스, type 결과읽기 } from '../prd/trace.js';

export type 앱종류 = 'SCREEN' | 'APP' | 'GAME' | 'API';
export interface 판정셈 { pass: number; fail: number; notRun: number }

export interface 앱요약 {
  serviceId: number;
  name: string;
  prefix: string;
  kind: 앱종류;
  /** 작성 read 가 없으면 null — PRD 는 작성 칸이 본다 */
  prd: {
    version: number;
    requirements: number;
    needsCheck: number;
    /** 요구사항마다 붙은 케이스의 마지막 결과 — none 은 테스트가 없는 요구 */
    rtm: 판정셈 & { none: number };
    /** (케이스, 축) 짝 수. 한 케이스가 둘을 덮으면 양쪽에 센다 */
    axis: { normal: number; error: number; ui: number; boundary: number };
  } | null;
  cases: { fn: number; ui: number };
  /** 케이스마다 마지막 결과(지원 기기 전부를 접은 것) */
  last: 판정셈;
  scenarios: number;
  /** 카드 아래 종류별 한 줄의 재료 — 웹 가장 느린 페이지 LCP · 게임 평균 FPS · API 95% 응답시간 */
  extra: { pageLcp: { url: string; ms: number } | null; fps: number | null; p95Ms: number | null };
}

const UI번호 = /-UI-\d{3}$/;
const 축이름: Record<string, keyof NonNullable<앱요약['prd']>['axis']> = { 정상: 'normal', 예외: 'error', UI: 'ui', 경계: 'boundary' };

/** 판 하나와 지도 ① 로 PRD 칸을 센다. 판에 없는 번호의 연결(지도에만 있는 것)은 세지 않는다 */
export function PRD셈(판: { version: number; items: PrdItem[] } | null, 지도: Record<string, 덮는케이스[]>, 결과: 결과읽기): NonNullable<앱요약['prd']> {
  const items = 판?.items ?? [];
  const rtm = { pass: 0, fail: 0, notRun: 0, none: 0 };
  const 짝 = new Set<string>();
  const axis = { normal: 0, error: 0, ui: 0, boundary: 0 };
  for (const item of items) {
    const 덮는 = 지도[item.reqId] ?? [];
    for (const c of 덮는) {
      const 이름 = 축이름[c.axis];
      if (이름 === undefined || 짝.has(`${c.tcId}|${c.axis}`)) continue;
      짝.add(`${c.tcId}|${c.axis}`);
      axis[이름] += 1;
    }
    const 셈 = 추적하기(덮는, 결과).결과;
    const 판정 = 셈 === null ? null : 요구판정(셈);
    if (판정 === null) rtm.none += 1;
    else if (판정 === 'PASS') rtm.pass += 1;
    else if (판정 === 'FAIL') rtm.fail += 1;
    else rtm.notRun += 1;
  }
  return { version: 판?.version ?? 0, requirements: items.length, needsCheck: items.filter((i) => i.status === 'NEEDS_CHECK').length, rtm, axis };
}

/** 활성 케이스마다 마지막 결과를 접는다 — 케이스 목록 · 추적표와 같은 케이스판정 */
export function 케이스셈(케이스들: { tcId: string; platforms: Platform[] }[], 결과: 결과읽기): { cases: 앱요약['cases']; last: 판정셈 } {
  const cases = { fn: 0, ui: 0 };
  const last = { pass: 0, fail: 0, notRun: 0 };
  for (const c of 케이스들) {
    cases[UI번호.test(c.tcId) ? 'ui' : 'fn'] += 1;
    const 판정 = 케이스판정(c.platforms.map((p) => 결과(c.tcId, p)));
    if (판정 === 'PASS') last.pass += 1;
    else if (판정 === 'FAIL') last.fail += 1;
    else last.notRun += 1;
  }
  return { cases, last };
}

export interface 시나리오재료 {
  id: number;
  name: string;
  serviceName: string;
  platform: Platform;
  steps: number;
  lastRun: { runId: number; verdict: ItemStatus | null; finishedAt: string | null } | null;
}

export interface E2E요약 extends 판정셈 {
  total: number;
  recent: { scenarioId: number; name: string; serviceName: string; platform: Platform; steps: number; runId: number; verdict: ItemStatus; finishedAt: string }[];
}

export const E2E최근수 = 5;

/** 시나리오마다 마지막 결과 하나 — 판정이 아직 없는(돌고 있거나 한 번도 안 돈) 시나리오는 셈에서 뺀다 */
export function E2E셈(시나리오들: 시나리오재료[]): E2E요약 {
  const 셈 = { pass: 0, fail: 0, notRun: 0 };
  const 끝난 = 시나리오들.flatMap((s) =>
    s.lastRun === null || s.lastRun.verdict === null || s.lastRun.finishedAt === null
      ? []
      : [{ scenarioId: s.id, name: s.name, serviceName: s.serviceName, platform: s.platform, steps: s.steps, runId: s.lastRun.runId, verdict: s.lastRun.verdict, finishedAt: s.lastRun.finishedAt }],
  );
  for (const s of 끝난) {
    if (s.verdict === 'PASS') 셈.pass += 1;
    else if (s.verdict === 'FAIL') 셈.fail += 1;
    else 셈.notRun += 1;
  }
  const recent = [...끝난].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt) || b.runId - a.runId).slice(0, E2E최근수);
  return { ...셈, total: 시나리오들.length, recent };
}

export const 그래프점수 = 240;

/** 초 단위 줄이 길면(긴 부하) 고르게 솎는다 — 대시보드는 모양만 보인다 */
// ponytail: k 번째마다 하나를 고른다. 순간 튀는 값이 빠질 수 있고, 모양이 틀어지면 구간 최대값으로 바꾼다
export function 솎기<T>(줄들: T[], 상한 = 그래프점수): T[] {
  if (줄들.length <= 상한) return 줄들;
  const k = Math.ceil(줄들.length / 상한);
  return 줄들.filter((_, i) => i % k === 0);
}
