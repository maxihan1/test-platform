// 요구사항 추적표 셈(prd/trace.ts)이 케이스 판정 · 종류 · 기법 · 결과를 규칙대로 세는지 본다
import type { ItemStatus, Platform } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 케이스판정, 요구판정, 추적하기, type 덮는케이스 } from './trace.js';

const 케이스 = (tcId: string, axis: string, techniques: string[] = [], platforms: Platform[] = ['desktop']): 덮는케이스 => ({
  tcId,
  axis,
  techniques,
  platforms,
});

const 결과표 = (표: Record<string, ItemStatus>) => (tcId: string, platform: Platform) => 표[`${tcId}:${platform}`];

describe('케이스판정', () => {
  it('기기 한쪽만 깨져도 실패, 전부 통과여야 통과, 안 돈 기기가 있으면 미실행이다', () => {
    expect(케이스판정(['PASS', 'FAIL'])).toBe('FAIL');
    expect(케이스판정(['PASS', undefined])).toBe('NA');
    expect(케이스판정(['FAIL', undefined])).toBe('FAIL');
    expect(케이스판정(['PASS', 'PASS'])).toBe('PASS');
    expect(케이스판정([])).toBe('NA');
  });
});

describe('추적하기', () => {
  it('축마다 세고 케이스는 번호로 한 번만 센다 — 기능 · UI 는 번호 꼴로 가른다', () => {
    const 추적 = 추적하기(
      [
        케이스('MKT-FN-001', '정상', ['동등 분할']),
        케이스('MKT-FN-001', '경계', ['동등 분할']),
        케이스('MKT-FN-002', '경계', ['경계값 분석', '동등 분할']),
        케이스('MKT-UI-001', 'UI'),
      ],
      null,
    );
    expect(추적.기능).toEqual(['MKT-FN-001', 'MKT-FN-002']);
    expect(추적.UI).toEqual(['MKT-UI-001']);
    expect(추적.종류).toEqual({ 정상: 1, 경계: 2, 예외: 0, UI: 1 });
    expect(추적.기법).toEqual([
      ['경계값 분석', 1],
      ['동등 분할', 2],
    ]);
    expect(추적.결과).toBeNull();
  });

  it('결과는 케이스마다 기기 판정을 묶어 센다', () => {
    const 추적 = 추적하기(
      [
        케이스('MKT-001', '정상', [], ['desktop', 'mobile']),
        케이스('MKT-002', '예외', [], ['desktop', 'mobile']),
        케이스('MKT-003', '정상'),
        케이스('MKT-004', '정상'),
      ],
      결과표({ 'MKT-001:desktop': 'PASS', 'MKT-001:mobile': 'FAIL', 'MKT-002:desktop': 'PASS', 'MKT-003:desktop': 'PASS' }),
    );
    expect(추적.결과).toEqual({ 통과: 1, 실패: 1, 미실행: 2 });
  });
});

describe('요구판정', () => {
  it('하나라도 실패면 실패, 다 통과면 통과, 그 밖은 미실행, 덮는 케이스가 없으면 null', () => {
    expect(요구판정({ 통과: 2, 실패: 1, 미실행: 1 })).toBe('FAIL');
    expect(요구판정({ 통과: 3, 실패: 0, 미실행: 0 })).toBe('PASS');
    expect(요구판정({ 통과: 2, 실패: 0, 미실행: 1 })).toBe('NA');
    expect(요구판정({ 통과: 0, 실패: 0, 미실행: 0 })).toBeNull();
  });
});
