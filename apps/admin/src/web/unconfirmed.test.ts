// 미확정 묶음 글자와 판정 없음 가르기가 도메인/실행 §3.2 「미확정 항목은 따로 센다」대로인지 본다

import { describe, expect, it } from 'vitest';

import type { RunCounts } from './api.js';
import { 끝난미확정, 미확정글자, 미확정나이, 판정없음 } from './unconfirmed.js';

const 확정만: RunCounts = { total: 3, pass: 2, fail: 1, na: 0, running: 0 };
const 섞임: RunCounts = {
  total: 10,
  pass: 3,
  fail: 1,
  na: 0,
  running: 1,
  unconfirmed: { total: 6, pass: 4, fail: 1, na: 0 },
};

describe('끝난미확정', () => {
  it('끝난 미확정 항목만 센다 — 진행 중인 것은 running 에 이미 있다', () => {
    expect(끝난미확정(섞임)).toBe(5);
  });

  it('미확정 칸이 없는 응답은 0 이다', () => {
    expect(끝난미확정(확정만)).toBe(0);
  });
});

describe('미확정글자', () => {
  it('미확정이 없으면 묶음을 쓰지 않는다', () => {
    expect(미확정글자(확정만, 'ko')).toBe('');
  });

  it('안의 판정을 괄호에 적고 0 인 칸은 뺀다', () => {
    expect(미확정글자(섞임, 'ko')).toBe('미확정 5(통과 4 · 실패 1)');
  });

  it('미실행도 적는다', () => {
    expect(미확정글자({ ...섞임, unconfirmed: { total: 2, pass: 0, fail: 0, na: 2 } }, 'ko')).toBe('미확정 2(미실행 2)');
  });

  it('영어로도 낸다', () => {
    expect(미확정글자(섞임, 'en')).toBe('Unconfirmed 5 (4 passed · 1 failed)');
  });
});

describe('판정없음', () => {
  it('미확정만 돌린 실행은 판정이 없다 — 성공 색도 실패 색도 안 칠한다', () => {
    expect(판정없음({ total: 2, pass: 0, fail: 0, na: 0, running: 0, unconfirmed: { total: 2, pass: 1, fail: 1, na: 0 } })).toBe(true);
  });

  it('확정 항목이 하나라도 있으면 판정이 있다', () => {
    expect(판정없음(섞임)).toBe(false);
    expect(판정없음(확정만)).toBe(false);
  });

  it('항목이 없는 실행은 미확정 규칙과 상관없다', () => {
    expect(판정없음({ total: 0, pass: 0, fail: 0, na: 0, running: 0 })).toBe(false);
  });
});

describe('미확정나이', () => {
  const 지금 = new Date('2026-09-26T12:00:00Z');

  it('처음 미확정이 된 뒤 지난 날을 센다', () => {
    expect(미확정나이('2026-09-03T12:00:00Z', 지금)).toBe(23);
  });

  it('오늘 생긴 것은 0 일이다', () => {
    expect(미확정나이('2026-09-26T08:00:00Z', 지금)).toBe(0);
  });
});
