// 1초 숫자로 성능 목표 판정 · 자동 중단 · 성능 저하를 센다 — admin 만 판정한다 (도메인/성능 §3.9 「자동 중단」 「성능 목표」)

import { addHist, emptyHist, percentile } from './hist.js';
import type { Target, TestType } from './types.js';

// 세 수는 이 한 곳이다 (§3.9 「자동 중단」)
export const STREAK_SEC = 10;
export const ERROR_LIMIT_PCT = 20;
export const AGENT_LOST_SEC = 30;
// 성능 저하 — 95% 응답시간이 20% 넘게 늘면 (§3.9 「성능 저하」)
export const DEGRADE_RATIO = 1.2;

export interface SecRow {
  sec: number;
  tx: string;
  vus: number;
  requests: number;
  errors: number;
  hist: number[];
}

export interface Measured {
  p95: number | null;
  errorRate: number | null;
  tps: number | null;
}

function measure(rows: SecRow[]): Measured {
  const hist = emptyHist();
  let requests = 0;
  let errors = 0;
  let tps: number | null = null;
  for (const r of rows) {
    addHist(hist, r.hist);
    requests += r.requests;
    errors += r.errors;
    tps = Math.max(tps ?? 0, r.requests);
  }
  return {
    p95: percentile(hist, 0.95),
    errorRate: requests === 0 ? null : (errors / requests) * 100,
    tps,
  };
}

const valueOf = (m: Measured, t: Target) => (t.metric === 'P95' ? m.p95 : t.metric === 'ERROR_RATE' ? m.errorRate : m.tps);
const keeps = (v: number | null, t: Target) => v !== null && (t.op === '<=' ? v <= t.value : v >= t.value);
const scopeRows = (rows: SecRow[], scope: string | undefined) => rows.filter((r) => r.tx === (scope ?? ''));

// 판정에 쓰는 구간 — 끝까지 돌았으면 전체, 목표나 에러율로 멈췄으면 멈추게 한 10초(그 뒤 덜 들어온 초는 뺀다)
export function judgeWindow(rows: SecRow[], stoppedAt: number | null): SecRow[] {
  if (stoppedAt === null) return rows;
  return rows.filter((r) => r.sec > stoppedAt - STREAK_SEC && r.sec <= stoppedAt);
}

export function judge(rows: SecRow[], targets: Target[]): { targets: (Target & { measured: number | null; verdict: 'PASS' | 'FAIL' })[]; verdict: 'PASS' | 'FAIL' } {
  const out = targets.map((t) => {
    const measured = valueOf(measure(scopeRows(rows, t.scope)), t);
    return { ...t, measured: measured === null ? null : Math.round(measured * 1000) / 1000, verdict: keeps(measured, t) ? ('PASS' as const) : ('FAIL' as const) };
  });
  return { targets: out, verdict: out.every((t) => t.verdict === 'PASS') ? 'PASS' : 'FAIL' };
}

export function summary(rows: SecRow[]): { maxVus: number; maxTps: number | null; p95: number | null; errorRate: number | null } {
  const total = scopeRows(rows, undefined);
  const m = measure(total);
  return { maxVus: total.reduce((x, r) => Math.max(x, r.vus), 0), maxTps: m.tps, p95: m.p95, errorRate: m.errorRate };
}

// atSec 는 멈추게 한 10초의 마지막 초다
export type Stop = { reason: 'ERROR_LIMIT'; atSec: number } | { reason: 'TARGET_EXCEEDED'; peakVus: number; atSec: number };

// 합쳐 끝난 초들을 보고 멈출지 정한다. rows 는 끝난 초까지만 넣는다
export function autoStop(rows: SecRow[], testType: TestType, targets: Target[]): Stop | null {
  const secs = [...new Set(rows.map((r) => r.sec))].sort((a, b) => a - b);
  if (secs.length < STREAK_SEC) return null;
  const tail = secs.slice(-STREAK_SEC);
  if (tail[STREAK_SEC - 1] - tail[0] !== STREAK_SEC - 1) return null;
  const at = (sec: number) => rows.filter((r) => r.sec === sec);
  const errorHigh = (sec: number) => {
    const m = measure(scopeRows(at(sec), undefined));
    return m.errorRate !== null && m.errorRate >= ERROR_LIMIT_PCT;
  };
  const atSec = tail[STREAK_SEC - 1] as number;
  if (tail.every(errorHigh)) return { reason: 'ERROR_LIMIT', atSec };
  if (testType !== 'STRESS') return null;
  const watched = targets.filter((t) => t.metric === 'P95' || t.metric === 'ERROR_RATE');
  if (watched.length === 0) return null;
  const exceeded = (sec: number) => watched.some((t) => {
    const v = valueOf(measure(scopeRows(at(sec), t.scope)), t);
    return v !== null && !keeps(v, t);
  });
  if (!tail.every(exceeded)) return null;
  // 틱을 걸러 끝난 초가 한 번에 여럿 늘면 벗어나기 시작한 초가 10초 창보다 앞일 수 있다 — 이어진 데까지 거슬러 간다
  let start = tail[0] as number;
  while (secs.includes(start - 1) && exceeded(start - 1)) start--;
  const before = scopeRows(at(start - 1), undefined)[0];
  return { reason: 'TARGET_EXCEEDED', peakVus: before?.vus ?? 0, atSec };
}

// 두 실행이 모두 지난 가상 사용자 수를 100명 단위로 내린 칸 [n, n+100) 의 95% 응답시간끼리 견준다
export function degraded(now: SecRow[], prev: SecRow[]): boolean | null {
  const a = scopeRows(now, undefined);
  const b = scopeRows(prev, undefined);
  const maxOf = (rs: SecRow[]) => rs.reduce((x, r) => Math.max(x, r.vus), 0);
  const point = Math.floor(Math.min(maxOf(a), maxOf(b)) / 100) * 100;
  const inBand = (rs: SecRow[]) => rs.filter((r) => r.vus >= point && r.vus < point + 100);
  const pa = measure(inBand(a)).p95;
  const pb = measure(inBand(b)).p95;
  if (pa === null || pb === null) return null;
  return pa > pb * DEGRADE_RATIO;
}
