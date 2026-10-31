// 롤백 판 규칙 — 받은 키가 처음 닿은 판 바로 앞 모습으로 돌리고, 닿지 않은 요구는 그대로 둔다 (도메인/BTS 「롤백 바퀴」 1 · 2)

import { describe, expect, it } from 'vitest';
import type { PrdItem } from '@platform/kit';

import { 롤백판, type 판기록 } from './rollback.js';

const 항목 = (reqId: string, text: string, 덧: Partial<PrdItem> = {}): PrdItem => ({
  reqId, feature: '쿠폰', text, basis: [{ from: '기획서', quote: text }], status: 'CONFIRMED', ...덧,
});
const 판 = (version: number, items: PrdItem[], changes: 판기록['changes'] = null, source = 'DECISION'): 판기록 => ({ version, source, items, changes });
const 바뀜 = (kind: 'ADD' | 'EDIT' | 'DEL' | 'CHECK', reqId: string, issueKeys: string[]) => ({ kind, reqId, text: null, asset: null, tcId: null, issueKeys });

const 첫판 = 판(1, [항목('MKW-REQ-001', '쿠폰은 두 장까지 쓴다'), 항목('MKW-REQ-002', '주문 내역은 1개월')], null, 'AGENT');

describe('롤백판', () => {
  it('키로 생긴 요구는 지우고 · 고친 요구는 앞 문장으로 · 지운 요구는 되살린다', () => {
    const 기록 = [
      첫판,
      판(2, [항목('MKW-REQ-001', '쿠폰은 한 장만 쓴다', { byPerson: true, fromIssues: ['DM-12'] }), 항목('MKW-REQ-003', '쿠폰을 바꾸면 알림', { byPerson: true, fromIssues: ['DM-12'] })], [
        바뀜('EDIT', 'MKW-REQ-001', ['DM-12']), 바뀜('DEL', 'MKW-REQ-002', ['DM-12']), 바뀜('ADD', 'MKW-REQ-003', ['DM-12']),
      ]),
    ];
    const 새 = 롤백판(기록, ['DM-12']);
    expect(새.items).toEqual(첫판.items);
    expect(새.changes.map((c) => [c.kind, c.reqId, c.text, c.issueKeys])).toEqual([
      ['EDIT', 'MKW-REQ-001', '쿠폰은 두 장까지 쓴다', ['DM-12']],
      ['DEL', 'MKW-REQ-003', null, ['DM-12']],
      ['ADD', 'MKW-REQ-002', '주문 내역은 1개월', ['DM-12']],
    ]);
  });

  it('받은 키가 처음 닿은 판 바로 앞으로 — 앞서 다른 이슈가 고친 모습은 남는다', () => {
    const 기록 = [
      첫판,
      판(2, [항목('MKW-REQ-001', '한 장만', { fromIssues: ['DM-12'] }), 첫판.items[1]!], [바뀜('EDIT', 'MKW-REQ-001', ['DM-12'])]),
      판(3, [항목('MKW-REQ-001', '한 장만 · 상품 쿠폰 제외', { fromIssues: ['DM-12', 'DM-14'] }), 첫판.items[1]!], [바뀜('EDIT', 'MKW-REQ-001', ['DM-14'])]),
    ];
    const 새 = 롤백판(기록, ['DM-14']);
    expect(새.items[0]).toEqual(항목('MKW-REQ-001', '한 장만', { fromIssues: ['DM-12'] }));
    expect(새.changes).toHaveLength(1);
  });

  it('키가 닿지 않았으면 바뀐 것이 없고 · 이미 되돌린 판에 같은 키가 또 와도 바뀐 것이 없다', () => {
    const 기록 = [
      첫판,
      판(2, [항목('MKW-REQ-001', '한 장만', { fromIssues: ['DM-12'] }), 첫판.items[1]!], [바뀜('EDIT', 'MKW-REQ-001', ['DM-12'])]),
    ];
    expect(롤백판(기록, ['DM-99']).changes).toEqual([]);
    const 한번 = 롤백판(기록, ['DM-12']);
    const 되돌린뒤 = [...기록, 판(3, 한번.items, 한번.changes, 'ROLLBACK')];
    expect(롤백판(되돌린뒤, ['DM-12']).changes).toEqual([]);
  });

  it('고르지 않아 확인 필요로 돌린 줄(CHECK)도 앞 모습으로 돌린다', () => {
    const 기록 = [
      첫판,
      판(2, [항목('MKW-REQ-001', '쿠폰은 두 장까지 쓴다', { status: 'NEEDS_CHECK', checkSince: '2026-11-01T00:00:00.000Z', byPerson: true, fromIssues: ['DM-12'] }), 첫판.items[1]!], [
        바뀜('CHECK', 'MKW-REQ-001', ['DM-12']),
      ]),
    ];
    const 새 = 롤백판(기록, ['DM-12']);
    expect(새.items[0]).toEqual(첫판.items[0]);
    expect(새.changes.map((c) => c.kind)).toEqual(['EDIT']);
  });
});
