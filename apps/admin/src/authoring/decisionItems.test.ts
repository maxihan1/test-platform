// 결정 목록 규칙 — 확인 필요 셋 가르기 · 결정 버전 짓기 · 셈 · API 요약 이름 · 재실행이 물려받는 decision (도메인/작성 §3.6 「★ 결정 목록」)

import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { API요약이름, 결정수세기, 결정판, 바뀐요구펴기, 요약이름들, 확인갈래, type 결정항목 } from './decisionItems.js';
import { 물려받을값 } from './params.js';

const 항목 = (reqId: string, text: string, 근거: [string, string][], status: PrdItem['status'] = 'NEEDS_CHECK'): PrdItem => ({
  reqId,
  feature: '주문',
  text,
  basis: 근거.map(([from, quote]) => ({ from, quote })),
  status,
  ...(status === 'NEEDS_CHECK' ? { checkSince: '2026-10-20T00:00:00.000Z' } : {}),
});

describe('확인갈래', () => {
  it('근거가 모두 화면이면 화면 기준, 자료 둘이 서로 다르게 적었으면 불일치(근거 차례로 선택지), 그 밖은 기타다', () => {
    expect(확인갈래(항목('MK-REQ-001', '쿠폰은 하나만', [['화면', '쿠폰 1장']]))).toEqual({ basis: 'SCREEN', options: [] });
    expect(확인갈래(항목('MK-REQ-002', '3만원 이상 무료', [['웹.docx', '3만원 이상 무료'], ['앱.docx', '5만원 이상 무료']]))).toEqual({
      basis: 'DOCS',
      options: [{ asset: '웹.docx', quote: '3만원 이상 무료' }, { asset: '앱.docx', quote: '5만원 이상 무료' }],
    });
    expect(확인갈래(항목('MK-REQ-003', '배송은 빠르게', [['웹.docx', '배송은 빠르게'], ['앱.docx', '배송은 빠르게']]))).toEqual({ basis: 'OTHER', options: [] });
    expect(확인갈래(항목('MK-REQ-004', '배송은 빠르게', [['웹.docx', '배송은 빠르게']]))).toEqual({ basis: 'OTHER', options: [] });
  });
});

describe('결정판', () => {
  const 판 = [항목('MK-REQ-001', '쿠폰은 하나만', [['화면', '쿠폰 1장']]), 항목('MK-REQ-002', '3만원 이상 무료', [['웹.docx', '3만원']]), 항목('MK-REQ-003', '확정된 것', [['웹.docx', '확정']], 'CONFIRMED')];

  it('의도와 같음은 확정만, 문장 변경 · 문구 선택은 문장을 바꿔 확정하고 바뀐 것을 적는다 — 고르지 않은 번호는 그대로다', () => {
    const r = 결정판(판, [
      { reqId: 'MK-REQ-001', pick: 'SAME' },
      { reqId: 'MK-REQ-002', pick: 'PICK', text: '5만원 이상 무료', asset: '앱.docx' },
    ]);
    expect(r?.items[0]).toEqual({ reqId: 'MK-REQ-001', feature: '주문', text: '쿠폰은 하나만', basis: [{ from: '화면', quote: '쿠폰 1장' }], status: 'CONFIRMED', byPerson: true });
    expect(r?.items[1]).toMatchObject({ text: '5만원 이상 무료', status: 'CONFIRMED', byPerson: true });
    expect(r?.items[1]).not.toHaveProperty('checkSince');
    expect(r?.items[2]).toBe(판[2]);
    expect(r?.changes).toEqual([
      { kind: 'CONFIRM', reqId: 'MK-REQ-001', text: null, asset: null, tcId: null },
      { kind: 'PICK', reqId: 'MK-REQ-002', text: '5만원 이상 무료', asset: '앱.docx', tcId: null },
    ]);
    expect(r?.문장바뀜).toBe(true);
  });

  it('지금 문장 그대로 「다름」을 고르면 확정으로 적고 문장은 안 바뀐 것으로 본다', () => {
    const r = 결정판(판, [{ reqId: 'MK-REQ-002', pick: 'EDIT', text: '3만원 이상 무료' }]);
    expect(r?.changes).toEqual([{ kind: 'CONFIRM', reqId: 'MK-REQ-002', text: null, asset: null, tcId: null }]);
    expect(r?.문장바뀜).toBe(false);
  });

  it('확인 필요가 아닌 번호 · 없는 번호를 고르면 null', () => {
    expect(결정판(판, [{ reqId: 'MK-REQ-003', pick: 'SAME' }])).toBeNull();
    expect(결정판(판, [{ reqId: 'MK-REQ-009', pick: 'SAME' }])).toBeNull();
  });
});

describe('결정수세기', () => {
  const 줄 = (kind: 'CHECK' | 'FAIL' | 'APIS', picks: 결정항목['picks']) => ({ kind, picks }) as unknown as 결정항목;

  it('고를 수 있는 항목만 세고, 고를 수 있는 실패가 있으면 20건 밖의 실패도 센다', () => {
    expect(결정수세기([줄('CHECK', ['SAME', 'EDIT']), 줄('APIS', []), 줄('FAIL', ['SCREEN'])], 5)).toBe(7);
    expect(결정수세기([줄('CHECK', []), 줄('FAIL', [])], 5)).toBe(0);
  });
});

describe('바뀐요구펴기', () => {
  it('바뀜은 두 문장, 새 항목은 옛 문장이 없고 지운 것은 새 문장이 없다', () => {
    const 기준 = [항목('MK-REQ-001', '옛 문장', []), 항목('MK-REQ-002', '지울 것', [])];
    const 지금 = [항목('MK-REQ-001', '새 문장', []), 항목('MK-REQ-003', '더한 것', [])];
    expect(바뀐요구펴기({ changed: ['MK-REQ-001'], added: ['MK-REQ-003'], removed: ['MK-REQ-002'] }, 기준, 지금)).toEqual({
      changed: [{ reqId: 'MK-REQ-001', text: '새 문장', oldText: '옛 문장' }],
      added: [{ reqId: 'MK-REQ-003', text: '더한 것', oldText: null }],
      removed: [{ reqId: 'MK-REQ-002', text: null, oldText: '지울 것' }],
    });
  });
});

describe('API요약이름', () => {
  it('문서의 {…} 마디는 서비스 지도 틀의 :… 마디와 맞고, 요약이 없거나 방식이 다르면 null', () => {
    const 이름들 = 요약이름들({ paths: { '/orders/{id}': { get: { summary: ' 주문 조회 ' }, delete: {} }, '/orders': { post: { summary: '주문하기' } } } });
    expect(이름들).toEqual([{ method: 'GET', path: '/orders/{id}', summary: '주문 조회' }, { method: 'POST', path: '/orders', summary: '주문하기' }]);
    expect(API요약이름(이름들, 'GET', '/orders/:n')).toBe('주문 조회');
    expect(API요약이름(이름들, 'DELETE', '/orders/:n')).toBeNull();
    expect(API요약이름(이름들, 'GET', '/orders/:n/items')).toBeNull();
  });
});

describe('물려받을값 — 결정 진행이 세운 요청', () => {
  it('재실행 · 이어하기는 count 만 물려받고 after 는 비운다', () => {
    const 결정 = { decision: { after: [11, 12], count: 3 } };
    expect(물려받을값({ kind: 'AUTHOR', params: { prdApply: true, ...결정 } }, {})).toEqual({ prdApply: true, decision: { after: [], count: 3 } });
    expect(물려받을값({ kind: 'AUTHOR', params: 결정 }, { x: 1 })).toEqual({ x: 1, decision: { after: [], count: 3 } });
    expect(물려받을값({ kind: 'AUTHOR', params: {} }, { x: 1 })).toEqual({ x: 1 });
  });
});
