// 「그중 미확정 N건」 글자와 나이 계산이 도메인/실행 §3.2 의 새 규칙(따로 묶어 세지 않는다)대로인지 본다

import { describe, expect, it } from 'vitest';

import type { RunCounts } from './api.js';
import { 그중미확정글, 미확정나이 } from './unconfirmed.js';

const 확정만: RunCounts = { total: 3, pass: 2, fail: 1, na: 0, running: 0 };
const 섞임: RunCounts = { total: 10, pass: 7, fail: 1, na: 0, running: 2, unconfirmed: 5 };

describe('그중미확정글', () => {
  it('미확정 칸이 없거나 0 이면 글을 쓰지 않는다', () => {
    expect(그중미확정글(확정만, 'ko')).toBe('');
    expect(그중미확정글({ ...확정만, unconfirmed: 0 }, 'ko')).toBe('');
  });

  it('미확정 수 하나를 「그중 미확정 N건」으로 적는다 — 통과·실패 안쪽 가름은 없다', () => {
    expect(그중미확정글(섞임, 'ko')).toBe('그중 미확정 5건');
  });

  it('영어로도 낸다', () => {
    expect(그중미확정글(섞임, 'en')).toBe('Of these, 5 unconfirmed');
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
