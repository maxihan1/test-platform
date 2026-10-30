// 페이지 성능 숫자 칸 계산 검사 — 평균은 값이 있는 페이지만 · 목표 넘은 페이지는 판정 실패만 (WEB-F7-16)

import { describe, expect, it } from 'vitest';

import type { PageRow } from './perfPageApi.js';
import { 숫자칸 } from './perfPagesView.js';

const 줄 = (name: string, lcpMs: number | null, fcpMs: number | null, verdict: PageRow['verdict']): PageRow => ({
  url: `/${name}`,
  name,
  sec: null,
  vus: null,
  device: 'desktop',
  network: 'NONE',
  lcpMs,
  fcpMs,
  cls: null,
  ttfbMs: null,
  lcpElement: null,
  resources: [],
  ai: null,
  verdict,
});

describe('페이지 성능 숫자 칸', () => {
  it('LCP · FCP 평균은 값이 없는 페이지를 빼고 내고, 목표 넘은 페이지는 판정이 실패인 것만 센다', () => {
    expect(숫자칸([줄('메인', 1600, 900, 'PASS'), 줄('결제', 3200, null, 'FAIL'), 줄('목록', null, 1500, null)])).toEqual({ lcp평균: 2400, fcp평균: 1200, 넘은: ['결제'] });
    expect(숫자칸([])).toEqual({ lcp평균: null, fcp평균: null, 넘은: [] });
  });
});
