import { describe, expect, it } from 'vitest';

import { 커버리지모양검사, 커버리지칸, 행커버리지 } from './coverage.js';

const 맞는셈 = {
  total: 10,
  cased: 4,
  held: 1,
  excluded: { '다음 요청': 3, '요구 아님': 2 },
  missing: ['REQ-A-9'],
  later: ['REQ-A-5', 'REQ-A-6', 'REQ-A-7'],
};

describe('커버리지모양검사', () => {
  it('합이 맞는 셈을 받는다', () => {
    expect(커버리지모양검사(맞는셈)).toEqual(맞는셈);
  });

  it('보류를 모르면 null 을 받는다', () => {
    expect(커버리지모양검사({ ...맞는셈, held: null })).not.toBeNull();
  });

  it('원장에 못 넣은 자료 목록을 받는다', () => {
    expect(커버리지모양검사({ ...맞는셈, unread: ['설계.pdf'] })).not.toBeNull();
  });

  it('원장이 없으면 까닭 하나만 받는다', () => {
    expect(커버리지모양검사({ none: '글자본이 없는 자료(PDF · 피그마)' })).toEqual({ none: '글자본이 없는 자료(PDF · 피그마)' });
    expect(커버리지모양검사({ none: '' })).toBeNull();
    expect(커버리지모양검사({ none: 'x'.repeat(501) })).toBeNull();
    expect(커버리지모양검사({ ...맞는셈, none: '원장 없음' })).toBeNull();
  });

  it('원장 크기에는 상한을 두지 않는다', () => {
    const 많이 = Array.from({ length: 20000 }, (_, i) => `P-${String(i + 1).padStart(5, '0')}`);
    expect(커버리지모양검사({ total: 20000, cased: 0, held: 0, excluded: {}, missing: 많이, later: [] })).not.toBeNull();
  });

  it.each([
    ['음수', { ...맞는셈, total: -1 }],
    ['소수', { ...맞는셈, cased: 4.5, total: 10.5 }],
    ['글자 수', { ...맞는셈, total: '10' }],
    ['요구 = 케이스 + 제외 + 빠짐 이 아님', { ...맞는셈, total: 11 }],
    ['보류가 케이스보다 많음', { ...맞는셈, held: 5 }],
    ['보류가 음수', { ...맞는셈, held: -1 }],
    ['제외 종류 이름이 빔', { ...맞는셈, excluded: { '': 5 } }],
    ['제외 종류 이름이 20자 넘음', { ...맞는셈, excluded: { ['가'.repeat(21)]: 5 } }],
    ['제외 종류가 10개 넘음', { ...맞는셈, total: 16, excluded: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`종류${String(i)}`, 1])) }],
    ['제외 수가 음수', { ...맞는셈, excluded: { '다음 요청': 6, '요구 아님': -1 } }],
    ['번호가 200자 넘음', { ...맞는셈, missing: ['R'.repeat(201)] }],
    ['번호가 빈 글', { ...맞는셈, missing: [''] }],
    ['다음 요청이 제외보다 많음', { ...맞는셈, later: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6'] }],
    ['자료 이름이 글이 아님', { ...맞는셈, unread: [3] }],
    ['모르는 키', { ...맞는셈, extra: 1 }],
    ['빠진 키', { total: 10, cased: 4, held: 1, excluded: {}, missing: [] }],
    ['배열', [맞는셈]],
  ])('%s 이면 null', (_, 값) => {
    expect(커버리지모양검사(값)).toBeNull();
  });
});

describe('커버리지칸', () => {
  it('제외는 종류를 합치고 빠짐은 수로 옮긴다', () => {
    expect(커버리지칸(맞는셈)).toEqual({ total: 10, cased: 4, held: 1, excluded: 5, missing: 1 });
  });

  it('원장이 없거나 셈이 없으면 전부 비운다', () => {
    const 빈칸 = { total: null, cased: null, held: null, excluded: null, missing: null };
    expect(커버리지칸({ none: '원장 없음' })).toEqual(빈칸);
    expect(커버리지칸(null)).toEqual(빈칸);
  });
});

describe('행커버리지 — 상세가 싣는 셈', () => {
  it('저장된 result.coverage 를 다시 보고 싣는다', () => {
    expect(행커버리지({ coverage: 맞는셈, diffs: [] })).toEqual(맞는셈);
  });

  it('셈이 없거나 모양이 틀린 옛 행이면 null', () => {
    expect(행커버리지(null)).toBeNull();
    expect(행커버리지({ diffs: [] })).toBeNull();
    expect(행커버리지({ coverage: { total: 3 } })).toBeNull();
  });
});
