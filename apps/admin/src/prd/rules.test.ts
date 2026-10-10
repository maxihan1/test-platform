// 표준 기획서 새 판 짓기 규칙 — 번호 · checkSince · byPerson · 옮기기 합치기 · 반영 안 됨 (도메인/작성 §7 「표준 기획서 통로」)

import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 반영안됨, 사람판, 옮기기판, 확인필요, 확정판, 항목검사, type 들어온항목 } from './rules.js';

const 근거 = [{ from: '기획서.docx', ref: 'REQ-1', quote: '비밀번호는 8자 이상' }];
const 항목 = (reqId: string, 덧: Partial<PrdItem> = {}): PrdItem => ({
  reqId,
  feature: '회원가입',
  text: `${reqId} 요구`,
  basis: 근거,
  status: 'CONFIRMED',
  ...덧,
});
const 새것 = (덧: Partial<들어온항목> = {}): 들어온항목 => ({
  feature: '회원가입',
  text: '새 요구',
  basis: 근거,
  status: 'CONFIRMED',
  ...덧,
});
const 시각 = '2026-10-10T00:00:00.000Z';

describe('항목검사', () => {
  it('맞는 항목은 사람 칸만 남기고 서버 표시는 버린다', () => {
    const r = 항목검사([{ ...항목('MKT-REQ-001'), checkSince: '아무거나', byPerson: true }], 'MKT');
    expect(r).toEqual({ items: [{ reqId: 'MKT-REQ-001', feature: '회원가입', text: 'MKT-REQ-001 요구', basis: 근거, status: 'CONFIRMED' }] });
  });

  it('남의 접두사 · 겹친 번호 · 빈 근거 · 긴 문장은 어느 자리인지 짚어 거절한다', () => {
    expect(항목검사([항목('CDY-REQ-001')], 'MKT')).toEqual({ error: 'BAD_PRD', detail: '0.reqId' });
    expect(항목검사([항목('MKT-REQ-001'), 항목('MKT-REQ-001')], 'MKT')).toEqual({ error: 'BAD_PRD', detail: '1.reqId' });
    expect(항목검사([{ ...항목('MKT-REQ-001'), basis: [] }], 'MKT')).toEqual({ error: 'BAD_PRD', detail: '0.basis' });
    expect(항목검사([{ ...항목('MKT-REQ-001'), text: '가'.repeat(1001) }], 'MKT')).toEqual({ error: 'BAD_PRD', detail: '0.text' });
    expect(항목검사([{ ...항목('MKT-REQ-001'), basis: [{ from: '화면', quote: '' }] }], 'MKT')).toEqual({
      error: 'BAD_PRD',
      detail: '0.basis.0',
    });
  });

  it('reqId 가 null 이면 새 항목이다', () => {
    expect(항목검사([{ ...새것(), reqId: null }], 'MKT')).toEqual({ items: [새것()] });
  });

  it('999 개를 넘으면 PRD_FULL', () => {
    expect(항목검사(Array.from({ length: 1000 }, () => 새것()), 'MKT')).toEqual({ error: 'PRD_FULL', detail: '1000' });
  });
});

describe('사람판', () => {
  const 앞 = { version: 3, lastNo: 5, items: [항목('MKT-REQ-001'), 항목('MKT-REQ-004', { status: 'NEEDS_CHECK', checkSince: '2026-10-01T00:00:00.000Z' })] };

  it('새 항목은 지운 번호를 건너뛰고 last_no 다음 번호를 받는다', () => {
    const r = 사람판(앞, [새것(), 항목('MKT-REQ-001')], 'MKT', 시각);
    expect(r).toMatchObject({ lastNo: 6, items: [{ reqId: 'MKT-REQ-001' }, { reqId: 'MKT-REQ-006', byPerson: true }] });
  });

  it('지금 판에 없는 번호는 PRD_REUSED — 되돌리기의 옛 번호만 받는다', () => {
    expect(사람판(앞, [항목('MKT-REQ-002')], 'MKT', 시각)).toEqual({ error: 'PRD_REUSED', detail: 'MKT-REQ-002' });
    expect(사람판(앞, [항목('MKT-REQ-002')], 'MKT', 시각, new Set(['MKT-REQ-002']))).toMatchObject({
      items: [{ reqId: 'MKT-REQ-002', byPerson: true }],
    });
  });

  it('999 를 넘는 번호는 주지 않는다', () => {
    expect(사람판({ ...앞, lastNo: 999 }, [새것()], 'MKT', 시각)).toEqual({ error: 'PRD_FULL', detail: '1000' });
  });

  it('바꾼 항목에만 byPerson 을 달고 안 바꾼 항목은 앞 판 값을 물려준다', () => {
    const 고친앞 = { ...앞, items: [항목('MKT-REQ-001', { byPerson: true }), 항목('MKT-REQ-003')] };
    const r = 사람판(고친앞, [항목('MKT-REQ-001'), 항목('MKT-REQ-003', { text: '고침' })], 'MKT', 시각);
    expect(r).toMatchObject({ items: [{ byPerson: true }, { text: '고침', byPerson: true }] });
    const 그대로 = 사람판({ ...앞, items: [항목('MKT-REQ-003')] }, [항목('MKT-REQ-003')], 'MKT', 시각);
    expect(그대로).toEqual({ lastNo: 5, items: [항목('MKT-REQ-003')] });
  });

  it('근거 키 차례만 다른 것은 바꾼 것이 아니다 — DB 가 키 차례를 바꿔 돌려준다', () => {
    const 디비것 = 항목('MKT-REQ-003', { basis: [{ ref: 'REQ-1', from: '기획서.docx', quote: '비밀번호는 8자 이상' }] });
    const r = 사람판({ ...앞, items: [디비것] }, [항목('MKT-REQ-003')], 'MKT', 시각);
    expect('error' in r ? null : r.items[0]).not.toHaveProperty('byPerson');
  });

  it('checkSince — 확인 필요로 바뀌면 이번 시각, 계속 확인 필요면 앞 판 값, 확정이면 없다', () => {
    const r = 사람판(
      앞,
      [항목('MKT-REQ-001', { status: 'NEEDS_CHECK' }), 항목('MKT-REQ-004', { status: 'NEEDS_CHECK', text: '고침' })],
      'MKT',
      시각,
    );
    expect(r).toMatchObject({
      items: [{ checkSince: 시각 }, { checkSince: '2026-10-01T00:00:00.000Z' }],
    });
    const 확정 = 사람판(앞, [항목('MKT-REQ-004')], 'MKT', 시각);
    expect('error' in 확정 ? null : 확정.items[0]).not.toHaveProperty('checkSince');
  });
});

describe('확정판', () => {
  const 앞 = { version: 2, lastNo: 2, items: [항목('MKT-REQ-001'), 항목('MKT-REQ-002', { status: 'NEEDS_CHECK', checkSince: 시각 })] };

  it('확인 필요만 확정하고 checkSince 를 빼고 byPerson 을 단다', () => {
    expect(확정판(앞, ['MKT-REQ-002'])).toEqual({
      lastNo: 2,
      items: [항목('MKT-REQ-001'), 항목('MKT-REQ-002', { byPerson: true })],
    });
  });

  it('확인 필요가 아닌 번호 · 빈 목록은 BAD_CONFIRM', () => {
    expect(확정판(앞, ['MKT-REQ-001'])).toEqual({ error: 'BAD_CONFIRM', detail: 'MKT-REQ-001' });
    expect(확정판(앞, [])).toEqual({ error: 'BAD_CONFIRM', detail: '' });
  });
});

describe('옮기기판', () => {
  const 받은판 = { version: 1, lastNo: 3, items: [항목('MKT-REQ-001'), 항목('MKT-REQ-002'), 항목('MKT-REQ-003')] };

  it('사람이 고친 항목은 사람 것을 남기고 문서와 다르면 번호를 돌려준다', () => {
    const 지금판 = { ...받은판, version: 2, items: [항목('MKT-REQ-001', { text: '사람 고침', byPerson: true as const }), 항목('MKT-REQ-002'), 항목('MKT-REQ-003')] };
    const r = 옮기기판(받은판, 지금판, [항목('MKT-REQ-001', { text: '문서 고침' }), 항목('MKT-REQ-002', { text: '문서 고침' }), 항목('MKT-REQ-003')], 'MKT', 시각);
    expect(r).toMatchObject({
      keptByPerson: ['MKT-REQ-001'],
      items: [{ text: '사람 고침', byPerson: true }, { text: '문서 고침' }, { reqId: 'MKT-REQ-003' }],
    });
    expect('error' in r ? null : r.items[1]).not.toHaveProperty('byPerson');
  });

  it('받은 판 뒤에 사람이 지운 번호는 되살리지 않고, 사람이 더한 항목은 남긴다', () => {
    const 지금판 = { version: 2, lastNo: 4, items: [항목('MKT-REQ-001'), 항목('MKT-REQ-004', { byPerson: true as const })] };
    const r = 옮기기판(받은판, 지금판, [항목('MKT-REQ-001'), 항목('MKT-REQ-002'), 새것()], 'MKT', 시각);
    expect(r).toMatchObject({
      lastNo: 5,
      keptByPerson: ['MKT-REQ-002'],
      items: [{ reqId: 'MKT-REQ-001' }, { reqId: 'MKT-REQ-004', byPerson: true }, { reqId: 'MKT-REQ-005' }],
    });
  });

  it('문서에서 빠졌어도 사람이 고친 항목은 남기고 알린다. 지어낸 번호는 PRD_REUSED', () => {
    const 지금판 = { ...받은판, items: [항목('MKT-REQ-001', { byPerson: true as const }), 항목('MKT-REQ-002')] };
    expect(옮기기판(받은판, 지금판, [], 'MKT', 시각)).toMatchObject({
      keptByPerson: ['MKT-REQ-001'],
      items: [{ reqId: 'MKT-REQ-001' }],
    });
    expect(옮기기판(받은판, 받은판, [항목('MKT-REQ-009')], 'MKT', 시각)).toEqual({ error: 'PRD_REUSED', detail: 'MKT-REQ-009' });
  });

  it('표준 기획서가 없으면 전부 새 번호다', () => {
    expect(옮기기판(null, null, [새것(), 새것({ status: 'NEEDS_CHECK' })], 'MKT', 시각)).toMatchObject({
      lastNo: 2,
      keptByPerson: [],
      items: [{ reqId: 'MKT-REQ-001' }, { reqId: 'MKT-REQ-002', checkSince: 시각 }],
    });
  });
});

describe('반영안됨 · 확인필요', () => {
  it('요구 문장이 바뀐 것 · 더한 것 · 지운 것만 센다. 상태만 바뀐 것은 안 센다', () => {
    const 기준 = [항목('MKT-REQ-001'), 항목('MKT-REQ-002'), 항목('MKT-REQ-003')];
    const 지금 = [항목('MKT-REQ-001', { status: 'NEEDS_CHECK' }), 항목('MKT-REQ-002', { text: '고침' }), 항목('MKT-REQ-004')];
    expect(반영안됨(기준, 지금)).toEqual({ changed: ['MKT-REQ-002'], added: ['MKT-REQ-004'], removed: ['MKT-REQ-003'] });
    expect(반영안됨(null, 지금).added).toHaveLength(3);
  });

  it('확인 필요 수와 가장 오래된 시각', () => {
    const items = [
      항목('MKT-REQ-001', { status: 'NEEDS_CHECK', checkSince: '2026-10-05T00:00:00.000Z' }),
      항목('MKT-REQ-002', { status: 'NEEDS_CHECK', checkSince: '2026-10-02T00:00:00.000Z' }),
      항목('MKT-REQ-003'),
    ];
    expect(확인필요(items)).toEqual({ count: 2, oldestSince: '2026-10-02T00:00:00.000Z' });
    expect(확인필요([])).toEqual({ count: 0, oldestSince: null });
  });
});
