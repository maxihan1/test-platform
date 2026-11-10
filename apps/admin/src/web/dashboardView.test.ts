// 대시보드 · 실행 요약이 쓰는 순수 계산 검사 — 도넛 조각 · 날짜 글자 (dashboardView.ts)

import { describe, expect, it } from 'vitest';

import { 날짜글자, 도넛조각 } from './dashboardView.js';

const 건 = (pass: number, fail: number, notRun: number) => ({ pass, fail, notRun });

describe('도넛 조각', () => {
  it('길이는 pathLength 100 기준이고 시작이 앞 조각 뒤에서 이어진다', () => {
    expect(도넛조각(건(50, 25, 25))).toEqual([
      { 종류: 'p', 길이: 50, 시작: 0 },
      { 종류: 'f', 길이: 25, 시작: 50 },
      { 종류: 'n', 길이: 25, 시작: 75 },
    ]);
  });

  it('0 인 조각은 그리지 않고 전부 0 이면 빈 배열이다', () => {
    expect(도넛조각(건(3, 0, 1)).map((조각) => 조각.종류)).toEqual(['p', 'n']);
    expect(도넛조각(건(0, 0, 0))).toEqual([]);
  });
});

describe('글자 조각', () => {
  it('날짜는 월/일이다', () => {
    expect(날짜글자('2026-10-07')).toBe('10/7');
  });
});
