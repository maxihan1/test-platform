// 기기 성능 셈 — 기기 요약 · 목표 판정 · 구간 묶기 · 회차별 메모리 · 누수 의심 (도메인/성능 §3.9 「기기 성능」 · §7) — 순수 함수

import { z } from 'zod';

import type { DeviceRunConfig } from './types.js';

export const 기기지표들 = ['AVG_FPS', 'LOW1_FPS', 'JANK_PER_MIN', 'MAX_TEMP', 'MAX_MEM', 'LAUNCH_MS'] as const;
export type 기기지표 = (typeof 기기지표들)[number];

// FPS 는 높을수록, 나머지는 낮을수록 좋다 — 방향이 지표에 매여 있어 요청이 거꾸로 오면 거절한다
const 방향: Record<기기지표, '<=' | '>='> = { AVG_FPS: '>=', LOW1_FPS: '>=', JANK_PER_MIN: '<=', MAX_TEMP: '<=', MAX_MEM: '<=', LAUNCH_MS: '<=' };

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
  freezeCount: number | null;
  cpu: number | null;
  memMb: number | null;
  tempC: number | null;
  batteryPct: number | null;
  /** 프레임 시간 분포 { "<칸 ms>": 수 }. 못 읽은 간격은 null, 새 프레임이 없는 간격은 {} */
  frameHist: Record<string, number> | null;
  thermalStatus: number | null;
  gpu: number | null;
  vramMb: number | null;
}

export interface 기기요약 {
  avgFps: number | null;
  low1Fps: number | null;
  jankPerMin: number | null;
  maxTempC: number | null;
  /** 실행 동안 1초 숫자의 프리징을 더한 것 */
  freezeCount: number | null;
  maxMemMb: number | null;
  avgCpu: number | null;
  avgGpu: number | null;
  maxVramMb: number | null;
}

export type 기기판정줄 = Omit<기기목표줄, 'scope'> & { scope: string; measured: number | null; verdict: 'PASS' | 'FAIL' };

const 값들 = (xs: (number | null)[]): number[] => xs.filter((x): x is number => x !== null);
const 평균 = (v: number[]): number | null => (v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length);
const 최대 = (v: number[]): number | null => (v.length === 0 ? null : Math.max(...v));
const 한자리 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10) / 10);
const 합 = (v: number[]): number | null => (v.length === 0 ? null : v.reduce((a, b) => a + b, 0));

// 러너 apps/runner/src/perfAdb.ts 의 막대칸과 같은 값이다 — admin 은 러너를 import 하지 않아 따로 둔다. gfxinfo HISTOGRAM 칸 이름(ms)이고 칸의 아래 끝이다
const 범위 = (처음: number, 끝: number, 폭: number) => Array.from({ length: (끝 - 처음) / 폭 + 1 }, (_, i) => 처음 + i * 폭);
export const 막대칸: readonly number[] = [...범위(5, 32, 1), ...범위(34, 48, 2), ...범위(53, 133, 4), ...범위(150, 4950, 50)];
const 끊김칸부터 = 125;
/** 열 상태 0~6 의 이름 — Android 가 쓰는 이름 그대로다(화면 perfDeviceView.ts 와 같다) */
export const 열상태이름 = ['NONE', 'LIGHT', 'MODERATE', 'SEVERE', 'CRITICAL', 'EMERGENCY', 'SHUTDOWN'] as const;

/** 칸 값은 그 칸과 다음 칸 아래 끝의 가운데다 — 150ms 위 칸은 50ms 폭이라 아래 끝으로 세면 느린 프레임이 빨라 보인다. 마지막 칸은 아래 끝 */
const 칸값 = new Map(막대칸.map((c, i) => [String(c), i < 막대칸.length - 1 ? (c + (막대칸[i + 1] as number)) / 2 : c]));

/** 부른 쪽이 받은 값을 gfxinfo 칸 이름 · 0 이상 정수 값만 든 분포로 거른다 — 아니면 null (그 줄의 분포만 버린다) */
export function 분포거르기(v: unknown): Record<string, number> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const 항목 = Object.entries(v);
  return 항목.every(([k, n]) => 칸값.has(k) && typeof n === 'number' && Number.isInteger(n) && n >= 0) ? (v as Record<string, number>) : null;
}

/** 기기 하나의 분포를 모두 더한다. 분포가 하나도 없으면 null */
function 분포합(rows: readonly 기기줄[]): Map<string, number> | null {
  const 합계 = new Map<string, number>();
  let 있음 = false;
  for (const r of rows) {
    if (r.frameHist === null) continue;
    있음 = true;
    for (const [k, n] of Object.entries(r.frameHist)) 합계.set(k, (합계.get(k) ?? 0) + n);
  }
  return 있음 ? 합계 : null;
}

/** 가장 느린 1%(적어도 한 프레임)의 평균 프레임 시간을 FPS 로 바꾼다 */
function 일퍼센트로우(rows: readonly 기기줄[]): number | null {
  const 합계 = 분포합(rows);
  if (합계 === null) return null;
  const 총 = [...합계.values()].reduce((a, b) => a + b, 0);
  if (총 === 0) return null;
  let 남음 = Math.max(1, Math.floor(총 * 0.01));
  const k = 남음;
  let ms합 = 0;
  for (const c of [...막대칸].reverse()) {
    const 수 = Math.min(합계.get(String(c)) ?? 0, 남음);
    ms합 += 수 * (칸값.get(String(c)) as number);
    남음 -= 수;
    if (남음 === 0) break;
  }
  return 한자리(1000 / (ms합 / k));
}

/** 끊김(125ms 칸부터 위) 프레임 수를 분포가 있는 줄의 잰 분으로 나눈다. `{}` 줄도 잰 시간에 든다 */
function 분당끊김(rows: readonly 기기줄[], intervalSec: number): number | null {
  const 잰줄 = rows.filter((r) => r.frameHist !== null);
  if (잰줄.length === 0) return null;
  const 끊김 = 잰줄.reduce((a, r) => a + Object.entries(r.frameHist ?? {}).reduce((b, [k, n]) => (Number(k) >= 끊김칸부터 ? b + n : b), 0), 0);
  return 한자리(끊김 / ((잰줄.length * intervalSec) / 60));
}

/** 평균 FPS · 1% Low FPS(프레임 시간 분포로 센다) · 분당 끊김 · 최대 온도 · 프리징 합 · 메모리 최대 · 평균 CPU · 평균 GPU · VRAM 최대. 값이 없으면 null */
export function 기기요약하기(rows: readonly 기기줄[], intervalSec: number): 기기요약 {
  const fps = 값들(rows.map((r) => r.fps));
  return {
    avgFps: 한자리(평균(fps)),
    low1Fps: 일퍼센트로우(rows),
    jankPerMin: 분당끊김(rows, intervalSec),
    maxTempC: 최대(값들(rows.map((r) => r.tempC))),
    freezeCount: 합(값들(rows.map((r) => r.freezeCount))),
    maxMemMb: 최대(값들(rows.map((r) => r.memMb))),
    avgCpu: 한자리(평균(값들(rows.map((r) => r.cpu)))),
    avgGpu: 한자리(평균(값들(rows.map((r) => r.gpu)))),
    maxVramMb: 최대(값들(rows.map((r) => r.vramMb))),
  };
}

/** 기기 하나의 목표 줄들 — scope 가 일련번호다. 값이 없으면 실패 */
export function 기기판정(serial: string, 목표들: readonly 기기목표줄[], 요약: 기기요약, launchMs: number | null): 기기판정줄[] {
  const 잰값: Record<기기지표, number | null> = {
    AVG_FPS: 요약.avgFps, LOW1_FPS: 요약.low1Fps, JANK_PER_MIN: 요약.jankPerMin, MAX_TEMP: 요약.maxTempC, MAX_MEM: 요약.maxMemMb, LAUNCH_MS: launchMs,
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

/** 회차마다 분당 끊김 — 반복 1회차에만 몰리는 끊김(셰이더 컴파일 의심)을 AI 가 보는 재료 */
export function 회차끊김(rows: readonly 기기줄[], intervalSec: number): { loop: number; jankPerMin: number | null }[] {
  const 회차들 = [...new Set(rows.flatMap((r) => (r.loop === null ? [] : [r.loop])))].sort((a, b) => a - b);
  return 회차들.map((loop) => ({ loop, jankPerMin: 분당끊김(rows.filter((r) => r.loop === loop), intervalSec) }));
}

/** 열 상태가 앞 줄(못 읽은 줄은 건너뜀)과 달라진 초 */
export function 열상태바뀜(rows: readonly 기기줄[]): { sec: number; status: number }[] {
  const 나옴: { sec: number; status: number }[] = [];
  let 앞: number | null = null;
  for (const r of [...rows].sort((a, b) => a.sec - b.sec)) {
    if (r.thermalStatus === null) continue;
    if (앞 !== null && r.thermalStatus !== 앞) 나옴.push({ sec: r.sec, status: r.thermalStatus });
    앞 = r.thermalStatus;
  }
  return 나옴;
}

/**
 * 메모리 누수 의심 — 회차별 메모리 최대의 기울기(최소제곱 · MB/회차). 회차가 3번 이상이고 기울기가 첫 회차(메모리 최대가 0 보다 큰 첫 회차) 값의 1% 이상일 때만 싣는다.
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
  const 첫값 = 회차들.find((r) => r.maxMemMb > 0)?.maxMemMb;
  if (첫값 === undefined || 기울기 < 첫값 * 0.01) return null;
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

type 기기실행 = { status: string; targets: { scope: string; verdict: string }[] | null } | undefined;

/** 디바이스마다 요약과 판정 — 결과 화면(GET /api/perf/runs/:id/devices)과 MCP perf_result 가 같이 쓴다 */
export function 기기줄들(기기별: { d: DeviceRunConfig['devices'][number]; 줄: Parameters<typeof 기기요약하기>[0] }[], 실행: 기기실행, intervalSec: number) {
  return 기기별.map(({ d, 줄 }) => ({
    serial: d.serial, model: d.model, where: d.where, launchMs: d.launchMs, spec: d.spec ?? null, summary: 기기요약하기(줄, intervalSec),
    // 판정은 끝까지 잰 실행에서만 싣는다. 숫자를 한 줄도 안 보낸 기기는 목표가 없어도 실패다
    verdict: 실행?.status === 'DONE' ? (줄.length > 0 && (실행.targets ?? []).filter((t) => t.scope === d.serial).every((t) => t.verdict === 'PASS') ? 'PASS' : 'FAIL') : null,
  }));
}
