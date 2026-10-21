// 성능 실행 화면의 계산 검사 — 판정 종류 · 최근 숫자 집계 · 목표 글자 (도메인/성능 §3.9)

import { describe, expect, it } from 'vitest';

import { 분초, 목표글자, 증가율, 최근집계, 판정종류 } from './perfRunView.js';

const 그대로 = (키: string, 값?: Record<string, string | number>) => Object.entries(값 ?? {}).reduce((글, [이름, v]) => 글.replace(`{${이름}}`, String(v)), 키);
const 줄 = (sec: number, 덮 = {}) => ({ sec, tx: '', vus: 10, requests: 100, errors: 1, p95Ms: 1000, p99Ms: 1500, ...덮 });

describe('판정 종류', () => {
  it('판정이 있으면 판정이 먼저이고, 판정 없는 중단 · 오류는 따로 선다', () => {
    expect(판정종류({ status: 'DONE', verdict: 'PASS' })).toBe('PASS');
    expect(판정종류({ status: 'STOPPED', verdict: 'FAIL' })).toBe('FAIL');
    expect(판정종류({ status: 'STOPPED', verdict: null })).toBe('STOP');
    expect(판정종류({ status: 'ERROR', verdict: null })).toBe('ERROR');
    expect(판정종류({ status: 'RUNNING', verdict: null })).toBe('LIVE');
  });
});

describe('최근 숫자', () => {
  it('끝 다섯 줄의 초당 요청 평균 · 에러율 · 요청 가중 95% 를 센다', () => {
    const 숫자 = 최근집계([줄(1, { requests: 1000 }), ...[2, 3, 4, 5, 6].map((s) => 줄(s, { requests: 100, errors: 5, p95Ms: s * 100 }))]);
    expect(숫자).toEqual({ vus: 10, tps: 100, p95Ms: 400, errorRate: 5 });
  });

  it('줄이 없으면 null, 요청이 없으면 0 이다', () => {
    expect(최근집계([])).toBeNull();
    expect(최근집계([줄(1, { requests: 0, errors: 0 })])).toMatchObject({ tps: 0, p95Ms: 0, errorRate: 0 });
  });
});

describe('글자', () => {
  it('목표는 부등호와 단위를 붙인다', () => {
    expect(목표글자({ metric: 'P95', op: '<=', value: 2000 }, 그대로)).toBe('≤ 2초');
    expect(목표글자({ metric: 'ERROR_RATE', op: '<=', value: 1 }, 그대로)).toBe('≤ 1%');
    expect(목표글자({ metric: 'TPS', op: '>=', value: 300 }, 그대로)).toBe('≥ 300');
    expect(분초(1360)).toBe('22:40');
  });

  it('이전이 없으면 늘어난 비율이 없다', () => {
    expect(증가율(1900, 1400)).toBe(36);
    expect(증가율(1900, null)).toBeNull();
    expect(증가율(1900, 0)).toBeNull();
  });
});
