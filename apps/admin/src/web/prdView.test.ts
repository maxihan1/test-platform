import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 고친판, 고치기검사, 묶음들, 반영안됨줄, 확인필요줄 } from './prdView.js';

const 항목 = (reqId: string, feature: string, 덮을것: Partial<PrdItem> = {}): PrdItem => ({
  reqId,
  feature,
  text: `${reqId} 요구`,
  basis: [{ from: '기획서.docx', ref: 'REQ-1', quote: '원문' }],
  status: 'CONFIRMED',
  ...덮을것,
});

describe('기능 묶음', () => {
  it('판에 처음 나온 차례로 묶는다', () => {
    const 판 = [항목('MKT-REQ-001', '회원가입'), 항목('MKT-REQ-002', '로그인'), 항목('MKT-REQ-003', '회원가입')];
    expect(묶음들(판).map((g) => [g.feature, g.items.map((x) => x.reqId)])).toEqual([
      ['회원가입', ['MKT-REQ-001', 'MKT-REQ-003']],
      ['로그인', ['MKT-REQ-002']],
    ]);
  });
});

describe('확인 필요 줄', () => {
  it('확인 필요만 오래 기다린 것부터, 시각이 없으면 맨 아래', () => {
    const 판 = [
      항목('MKT-REQ-001', '가', { status: 'NEEDS_CHECK', checkSince: '2026-10-09T00:00:00.000Z' }),
      항목('MKT-REQ-002', '가'),
      항목('MKT-REQ-003', '가', { status: 'NEEDS_CHECK' }),
      항목('MKT-REQ-004', '가', { status: 'NEEDS_CHECK', checkSince: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(확인필요줄(판).map((x) => x.reqId)).toEqual(['MKT-REQ-004', 'MKT-REQ-001', 'MKT-REQ-003']);
  });
});

describe('반영 안 됨 줄', () => {
  it('바뀜 · 새 항목 · 지움 차례로, 지운 번호는 글 없이', () => {
    const 줄 = 반영안됨줄({
      items: [항목('MKT-REQ-001', '가'), 항목('MKT-REQ-005', '가')],
      unapplied: { changed: ['MKT-REQ-001'], added: ['MKT-REQ-005'], removed: ['MKT-REQ-002'] },
    });
    expect(줄).toEqual([
      { kind: 'changed', reqId: 'MKT-REQ-001', text: 'MKT-REQ-001 요구' },
      { kind: 'added', reqId: 'MKT-REQ-005', text: 'MKT-REQ-005 요구' },
      { kind: 'removed', reqId: 'MKT-REQ-002', text: null },
    ]);
  });
});

describe('보낼 판', () => {
  const 판 = [항목('MKT-REQ-001', '가'), 항목('MKT-REQ-002', '나')];
  const 새것 = { feature: '다', text: '새 요구', basis: [{ from: '화면', quote: '보인 글' }], status: 'NEEDS_CHECK' as const };

  it('번호가 있으면 그 자리에서 바꾸고 번호는 그대로 둔다', () => {
    expect(고친판(판, 'MKT-REQ-001', 새것)).toEqual([{ ...새것, reqId: 'MKT-REQ-001' }, 판[1]]);
  });

  it('새것이 null 이면 그 항목을 뺀다', () => {
    expect(고친판(판, 'MKT-REQ-001', null)).toEqual([판[1]]);
  });

  it('번호가 없으면 번호 없이 맨 뒤에 더한다 — 번호는 서버가 매긴다', () => {
    expect(고친판(판, null, 새것)).toEqual([...판, 새것]);
  });
});

describe('고치기 칸 검사', () => {
  const 바른것 = { feature: '회원가입', text: '아이디는 4~12자다', basis: [{ from: '화면', ref: '/signup', quote: '4~12자' }], status: 'CONFIRMED' as const };

  it('다 찼으면 통과', () => {
    expect(고치기검사(바른것)).toBeNull();
  });

  it('공백만인 칸 · 빈 근거를 칸 이름으로 짚는다', () => {
    expect(고치기검사({ ...바른것, feature: '  ' })).toBe('feature');
    expect(고치기검사({ ...바른것, text: '' })).toBe('text');
    expect(고치기검사({ ...바른것, basis: [] })).toBe('basis');
    expect(고치기검사({ ...바른것, basis: [{ from: '', quote: '글' }] })).toBe('from');
    expect(고치기검사({ ...바른것, basis: [{ from: '화면', quote: ' ' }] })).toBe('quote');
  });

  it('서버 상한을 넘으면 long', () => {
    expect(고치기검사({ ...바른것, text: '가'.repeat(1001) })).toBe('long');
    expect(고치기검사({ ...바른것, basis: Array.from({ length: 11 }, () => 바른것.basis[0]!) })).toBe('long');
  });
});
