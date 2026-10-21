// 페이지 측정 셈 — 세 번 연 표본의 가운데 값 · 페이지 판정 · 목표 줄 (도메인/성능 §3.9 「페이지 성능」) — 순수 함수

import { z } from 'zod';

import { 페이지목표 } from './pageScript.js';
import type { Target } from './types.js';

const 리소스 = z.object({
  name: z.string().max(500),
  type: z.enum(['document', 'script', 'css', 'img', 'api', 'font', 'other']),
  startMs: z.number().min(0).max(1e7),
  durationMs: z.number().min(0).max(1e7),
  bytes: z.number().min(0).max(1e10),
});

const 밀리초 = z.number().min(0).max(1e7).nullable();

// 에이전트가 1초 숫자에 실어 보내는 표본 하나 (§5.4 「페이지」)
export const 표본 = z.object({
  url: z.string().min(1).max(500),
  lcpMs: 밀리초,
  fcpMs: 밀리초,
  cls: z.number().min(0).max(100).nullable(),
  ttfbMs: 밀리초,
  lcpElement: z.string().max(200).nullable(),
  resources: z.array(리소스).max(100),
});

export type 페이지표본 = z.infer<typeof 표본>;

function 가운데(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? (v[m] as number) : ((v[m - 1] as number) + (v[m] as number)) / 2;
}

/**
 * 같은 경로의 표본들을 한 줄로 — 지표마다 따로 가운데 값을 쓴다. 워터폴 · LCP 요소는 LCP 가 가운데 값에 가장 가까운 표본 것이다.
 * 처음 나온 경로 차례를 지킨다
 */
export function 가운데값(samples: 페이지표본[]): 페이지표본[] {
  const 묶음 = new Map<string, 페이지표본[]>();
  for (const s of samples) 묶음.set(s.url, [...(묶음.get(s.url) ?? []), s]);
  return [...묶음.entries()].map(([url, xs]) => {
    const lcp = 가운데(xs.map((x) => x.lcpMs));
    const 대표 = [...xs].sort((a, b) => Math.abs((a.lcpMs ?? Infinity) - (lcp ?? 0)) - Math.abs((b.lcpMs ?? Infinity) - (lcp ?? 0)))[0] as 페이지표본;
    const round = (v: number | null) => (v === null ? null : Math.round(v));
    const cls = 가운데(xs.map((x) => x.cls));
    return {
      url, lcpMs: round(lcp), fcpMs: round(가운데(xs.map((x) => x.fcpMs))), cls: cls === null ? null : Math.round(cls * 1000) / 1000,
      ttfbMs: round(가운데(xs.map((x) => x.ttfbMs))), lcpElement: 대표.lcpElement, resources: 대표.resources,
    };
  });
}

type 잰값 = Pick<페이지표본, 'lcpMs' | 'fcpMs' | 'cls'>;

/** 셋 중 하나라도 목표를 넘거나 값이 없으면 실패 (§3.9 「판정」) */
export function 페이지판정(p: 잰값): 'PASS' | 'FAIL' {
  const 지킴 = (v: number | null, 한도: number) => v !== null && v <= 한도;
  return 지킴(p.lcpMs, 페이지목표.LCP) && 지킴(p.fcpMs, 페이지목표.FCP) && 지킴(p.cls, 페이지목표.CLS) ? 'PASS' : 'FAIL';
}

export type 페이지목표줄 = Omit<Target, 'metric'> & { metric: 'LCP' | 'FCP' | 'CLS'; measured: number | null; verdict: 'PASS' | 'FAIL' };

/** perf_run.targets 에 쓰는 줄 — 페이지마다 셋, scope 가 경로다 */
export function 목표줄들(rows: (잰값 & { url: string })[]): 페이지목표줄[] {
  return rows.flatMap((r) =>
    (['LCP', 'FCP', 'CLS'] as const).map((metric) => {
      const measured = metric === 'LCP' ? r.lcpMs : metric === 'FCP' ? r.fcpMs : r.cls;
      const value = 페이지목표[metric];
      return { metric, scope: r.url, op: '<=' as const, value, source: 'AI' as const, measured, verdict: measured !== null && measured <= value ? ('PASS' as const) : ('FAIL' as const) };
    }),
  );
}
