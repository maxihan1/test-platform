// 자동 제목과 목록 거르개 읽기를 본다 (SPEC 도메인/실행 §7 `POST /api/runs` 「자동 제목」 · `GET /api/runs`)

import { describe, expect, it } from 'vitest';

import { 시작방식거르개, 자동제목 } from './runOrigin.js';

const 케이스 = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ tcId: `MKT-FN-${String(14 + i).padStart(3, '0')}`, name: '로그인 잠금' }));

describe('자동 제목', () => {
  it('전체 · 한 건 · 여러 건', () => {
    expect(자동제목({ origin: 'MANUAL', kind: 'FN', 케이스들: 케이스(382), 전체: true })).toBe('기능 전체 382건');
    expect(자동제목({ origin: 'MANUAL', kind: 'UI', 케이스들: 케이스(3), 전체: true })).toBe('UI 전체 3건');
    expect(자동제목({ origin: 'MANUAL', kind: 'FN', 케이스들: 케이스(1), 전체: false })).toBe('MKT-FN-014 로그인 잠금');
    expect(자동제목({ origin: 'MANUAL', kind: 'FN', 케이스들: 케이스(12), 전체: false })).toBe('MKT-FN-014 외 11건');
  });

  it('정기는 앞에 「정기 · 」를 붙이고 실패 다시는 원래 실행 번호를 적는다', () => {
    expect(자동제목({ origin: 'SCHEDULED', kind: 'FN', 케이스들: 케이스(382), 전체: true })).toBe('정기 · 기능 전체 382건');
    expect(자동제목({ origin: 'SCHEDULED', kind: 'FN', 케이스들: 케이스(340), 전체: false })).toBe('정기 · MKT-FN-014 외 339건');
    expect(자동제목({ origin: 'RERUN', rerunOf: 20914, kind: 'FN', 케이스들: 케이스(7), 전체: false })).toBe('RUN 20914의 실패 7건 다시');
    expect(자동제목({ origin: 'RERUN', rerunOf: 20914, kind: 'FN', 케이스들: 케이스(1), 전체: true })).toBe('RUN 20914의 실패 1건 다시');
  });
});

describe('목록 거르개 읽기', () => {
  it('아는 값만 받고 모르는 값 · 범위 밖은 버린다', () => {
    expect(시작방식거르개('rerun', '14')).toEqual({ origin: 'RERUN', days: 14 });
    expect(시작방식거르개('scheduled', '366')).toEqual({ origin: 'SCHEDULED', days: 366 });
    expect(시작방식거르개('manual', undefined)).toEqual({ origin: 'MANUAL' });
    expect(시작방식거르개('MANUAL', '0')).toEqual({});
    expect(시작방식거르개('constructor', '367')).toEqual({});
    expect(시작방식거르개(undefined, '1.5')).toEqual({});
    expect(시작방식거르개(undefined, '-3')).toEqual({});
  });
});
