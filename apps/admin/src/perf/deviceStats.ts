// 기기 성능 셈 — 기기 요약 · 목표 판정 · 구간 묶기 · 회차별 메모리 · 누수 의심 (도메인/성능 §3.9 「기기 성능」 · §7) — 순수 함수

import { z } from 'zod';

export const 기기지표들 = ['AVG_FPS', 'LOW1_FPS', 'MAX_TEMP', 'MAX_MEM', 'LAUNCH_MS'] as const;
export type 기기지표 = (typeof 기기지표들)[number];

// FPS 는 높을수록, 나머지는 낮을수록 좋다 — 방향이 지표에 매여 있어 요청이 거꾸로 오면 거절한다
const 방향: Record<기기지표, '<=' | '>='> = { AVG_FPS: '>=', LOW1_FPS: '>=', MAX_TEMP: '<=', MAX_MEM: '<=', LAUNCH_MS: '<=' };

export const 기기목표 = z.object({
  metric: z.enum(기기지표들),
  scope: z.literal('').optional(),
  op: z.enum(['<=', '>=']),
  value: z.number().min(0),
  source: z.enum(['PRD', 'AI', 'MANUAL']),
  reqId: z.string().max(50).optional(),
}).refine((t) => t.op === 방향[t.metric], '지표와 부등호 방향이 맞지 않습니다');

export type 기기목표줄 = z.infer<typeof 기기목표>;

export interface 기기줄 {
  sec: number;
  loop: number | null;
  segment: string | null;
  fps: number | null;
  jankPct: number | null;
  cpu: number | null;
  memMb: number | null;
  tempC: number | null;
  batteryPct: number | null;
}

export interface 기기요약 {
  avgFps: number | null;
  low1Fps: number | null;
  maxTempC: number | null;
  maxMemMb: number | null;
  avgCpu: number | null;
}

export type 기기판정줄 = Omit<기기목표줄, 'scope'> & { scope: string; measured: number | null; verdict: 'PASS' | 'FAIL' };

const 값들 = (xs: (number | null)[]): number[] => xs.filter((x): x is number => x !== null);
const 평균 = (v: number[]): number | null => (v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length);
const 최대 = (v: number[]): number | null => (v.length === 0 ? null : Math.max(...v));
const 한자리 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10) / 10);

/** 평균 FPS · 1% Low FPS(낮은 차례 아래 1%, 적어도 한 개의 평균) · 최대 온도 · 메모리 최대 · 평균 CPU. 값이 없으면 null */
export function 기기요약하기(rows: readonly 기기줄[]): 기기요약 {
  const fps = 값들(rows.map((r) => r.fps)).sort((a, b) => a - b);
  const 낮은 = fps.slice(0, Math.max(1, Math.floor(fps.length * 0.01)));
  return {
    avgFps: 한자리(평균(fps)),
    low1Fps: fps.length === 0 ? null : 한자리(평균(낮은)),
    maxTempC: 최대(값들(rows.map((r) => r.tempC))),
    maxMemMb: 최대(값들(rows.map((r) => r.memMb))),
    avgCpu: 한자리(평균(값들(rows.map((r) => r.cpu)))),
  };
}

/** 기기 하나의 목표 줄들 — scope 가 일련번호다. 값이 없으면 실패 */
export function 기기판정(serial: string, 목표들: readonly 기기목표줄[], 요약: 기기요약, launchMs: number | null): 기기판정줄[] {
  const 잰값: Record<기기지표, number | null> = {
    AVG_FPS: 요약.avgFps, LOW1_FPS: 요약.low1Fps, MAX_TEMP: 요약.maxTempC, MAX_MEM: 요약.maxMemMb, LAUNCH_MS: launchMs,
  };
  return 목표들.map((t) => {
    const measured = 잰값[t.metric];
    const 지킴 = measured !== null && (t.op === '<=' ? measured <= t.value : measured >= t.value);
    return { metric: t.metric, scope: serial, op: t.op, value: t.value, source: t.source, ...(t.reqId === undefined ? {} : { reqId: t.reqId }), measured, verdict: 지킴 ? 'PASS' : 'FAIL' };
  });
}

/** 구간 이름과 회차가 이어지는 초 범위 — 구간 이름이 없는 줄에서 끊긴다 */
export function 구간묶기(serial: string, rows: readonly 기기줄[]): { serial: string; loop: number; segment: string; fromSec: number; toSec: number }[] {
  const 나옴: { serial: string; loop: number; segment: string; fromSec: number; toSec: number }[] = [];
  let 이어 = -1;
  for (const r of [...rows].sort((a, b) => a.sec - b.sec)) {
    if (r.loop === null || r.segment === null) {
      이어 = -1;
      continue;
    }
    const 끝 = 나옴[이어];
    if (끝 !== undefined && 끝.loop === r.loop && 끝.segment === r.segment) 끝.toSec = r.sec;
    else {
      나옴.push({ serial, loop: r.loop, segment: r.segment, fromSec: r.sec, toSec: r.sec });
      이어 = 나옴.length - 1;
    }
  }
  return 나옴;
}

/** 회차마다 메모리 최대 */
export function 회차메모리(serial: string, rows: readonly 기기줄[]): { serial: string; loop: number; maxMemMb: number }[] {
  const 묶음 = new Map<number, number>();
  for (const r of rows) if (r.loop !== null && r.memMb !== null) 묶음.set(r.loop, Math.max(묶음.get(r.loop) ?? 0, r.memMb));
  return [...묶음.entries()].sort((a, b) => a[0] - b[0]).map(([loop, maxMemMb]) => ({ serial, loop, maxMemMb }));
}

/**
 * 메모리 누수 의심 — 회차별 메모리 최대의 기울기(최소제곱 · MB/회차). 회차가 3번 이상이고 기울기가 0보다 크면 싣는다.
 * loopsToLimit 은 메모리 목표가 있을 때 마지막 회차 값에서 그 목표를 넘을 때까지 남은 회차(올림), 없으면 null
 */
export function 누수의심(serial: string, 회차들: readonly { loop: number; maxMemMb: number }[], 메모리목표: number | null): { serial: string; perLoopMb: number; loopsToLimit: number | null } | null {
  if (회차들.length < 3) return null;
  const n = 회차들.length;
  const mx = 회차들.reduce((a, r) => a + r.loop, 0) / n;
  const my = 회차들.reduce((a, r) => a + r.maxMemMb, 0) / n;
  const 분모 = 회차들.reduce((a, r) => a + (r.loop - mx) ** 2, 0);
  if (분모 === 0) return null;
  const 기울기 = 회차들.reduce((a, r) => a + (r.loop - mx) * (r.maxMemMb - my), 0) / 분모;
  if (기울기 <= 0) return null;
  const 마지막 = 회차들[n - 1]?.maxMemMb ?? 0;
  return {
    serial,
    perLoopMb: Math.round(기울기 * 10) / 10,
    loopsToLimit: 메모리목표 === null ? null : Math.max(0, Math.ceil((메모리목표 - 마지막) / 기울기)),
  };
}

/** 구간 이름마다(회차를 가로질러) 평균 FPS · 최저 FPS · 최대 온도 — AI 분석 재료 */
export function 구간표별(rows: readonly 기기줄[]): { segment: string; avgFps: number | null; minFps: number | null; maxTempC: number | null }[] {
  const 묶음 = new Map<string, 기기줄[]>();
  for (const r of rows) if (r.segment !== null) 묶음.set(r.segment, [...(묶음.get(r.segment) ?? []), r]);
  return [...묶음.entries()].map(([segment, xs]) => {
    const fps = 값들(xs.map((x) => x.fps));
    return { segment, avgFps: 한자리(평균(fps)), minFps: fps.length === 0 ? null : Math.min(...fps), maxTempC: 최대(값들(xs.map((x) => x.tempC))) };
  });
}
