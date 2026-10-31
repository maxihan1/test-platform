// PRD 초안 카드에서 고른 줄을 판에 넣는 규칙 — 고른 줄은 확정 · 안 고른 「화면만 보고 적음」은 확인 필요 · 안 고른 확정 후보는 버림 (도메인/BTS 「PRD 초안 → 결정 필요」)

import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 상한 } from '../prd/rules.js';

import { 초안적용, type 초안카드, type 초안카드줄 } from './draftDecide.js';

const 시각 = '2026-10-31T12:00:00.000Z';
const 지금: PrdItem[] = [
  { reqId: 'MKW-REQ-001', feature: '주문 내역', text: '주문 내역은 최근 1개월 것을 보여 준다', basis: [{ from: '기획서', quote: '1개월' }], status: 'CONFIRMED' },
  { reqId: 'MKW-REQ-002', feature: '주문 내역', text: '「1개월」 기간 버튼이 있다', basis: [{ from: '기획서', quote: '기간 버튼' }], status: 'CONFIRMED', fromIssues: ['DM-3'] },
];
const 줄 = (덧: Partial<초안카드줄>): 초안카드줄 => ({ op: 'ADD', text: '쿠폰은 주문 한 건에 하나만 쓸 수 있다', basis: 'DM-12 본문', issueKeys: ['DM-12'], sure: true, oldText: null, gone: false, ...덧 });
const 카드 = (rows: 초안카드줄[]): 초안카드 => ({
  requestId: 7, state: 'DONE', reason: null, buildNo: 'a1b2c3d', finishedAt: null,
  issues: [{ key: 'DM-12', title: '장바구니 쿠폰 중복 적용 막기', url: null }, { key: 'DM-14', title: null, url: null }], rows, e2e: [],
});
const 적용 = (rows: 초안카드줄[], picked: number[]) => 초안적용(지금, 2, 'MKW', [{ key: 'draft:7', card: 카드(rows), picked: new Set(picked) }], 시각);

describe('초안적용', () => {
  it('고른 추가 줄은 새 번호 · 이슈 제목 기능 · 확정 · 꼬리표로 들어간다', () => {
    const r = 적용([줄({})], [0]);
    if ('error' in r) throw new Error(r.detail);
    expect(r.lastNo).toBe(3);
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-003')).toEqual({
      reqId: 'MKW-REQ-003', feature: '장바구니 쿠폰 중복 적용 막기', text: '쿠폰은 주문 한 건에 하나만 쓸 수 있다',
      basis: [{ from: 'DM-12', quote: 'DM-12 본문' }], status: 'CONFIRMED', byPerson: true, fromIssues: ['DM-12'],
    });
    expect(r.changes).toEqual([{ kind: 'ADD', reqId: 'MKW-REQ-003', text: '쿠폰은 주문 한 건에 하나만 쓸 수 있다', asset: null, tcId: null, issueKeys: ['DM-12'] }]);
  });

  it('긴 이슈 제목 · 많은 이슈 키는 PRD 상한(기능 이름 · 근거 자리)에 맞춰 자른다 — 다음 사람 저장이 막히지 않게', () => {
    const 긴카드 = { ...카드([줄({})]), issues: [{ key: 'DM-12', title: '가'.repeat(150), url: null }] };
    const 키들 = Array.from({ length: 30 }, (_, i) => `PROJ-${String(1000 + i)}`);
    const r = 초안적용(지금, 2, 'MKW', [{ key: 'draft:7', card: 긴카드, picked: new Set([0]) }], 시각);
    if ('error' in r) throw new Error(r.detail);
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-003')!.feature).toHaveLength(상한.기능묶음);
    const r2 = 적용([줄({ issueKeys: 키들 })], [0]);
    if ('error' in r2) throw new Error(r2.detail);
    expect(r2.items.find((x) => x.reqId === 'MKW-REQ-003')!.basis[0]!.from.length).toBeLessThanOrEqual(상한.근거자리);
  });

  it('제목이 없는 이슈의 추가 줄은 이슈 키가 기능 이름이다', () => {
    const r = 적용([줄({ issueKeys: ['DM-14'] })], [0]);
    if ('error' in r) throw new Error(r.detail);
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-003')?.feature).toBe('DM-14');
  });

  it('고른 수정 줄은 문장을 바꾸고 근거를 앞에 더하며 꼬리표를 합친다 · 고른 삭제 줄은 지운다', () => {
    const r = 적용(
      [
        줄({ op: 'EDIT', reqId: 'MKW-REQ-001', text: '주문 내역은 최근 3개월 것을 보여 준다', issueKeys: ['DM-14'] }),
        줄({ op: 'DEL', reqId: 'MKW-REQ-002', text: '기간 버튼을 없앤다', issueKeys: ['DM-14'] }),
      ],
      [0, 1],
    );
    if ('error' in r) throw new Error(r.detail);
    expect(r.items.map((x) => x.reqId)).toEqual(['MKW-REQ-001']);
    expect(r.items[0]).toMatchObject({ text: '주문 내역은 최근 3개월 것을 보여 준다', status: 'CONFIRMED', byPerson: true, fromIssues: ['DM-14'] });
    expect(r.items[0]!.basis[0]).toEqual({ from: 'DM-14', quote: 'DM-12 본문' });
    expect(r.items[0]!.basis).toHaveLength(2);
    expect(r.changes.map((c) => [c.kind, c.reqId])).toEqual([['EDIT', 'MKW-REQ-001'], ['DEL', 'MKW-REQ-002']]);
    expect(r.lastNo).toBe(2);
  });

  it('안 고른 「화면만 보고 적음」 줄은 확인 필요로 남는다 — 수정 · 삭제 줄은 사람이 확정한 문장을 덮지 않는다', () => {
    const r = 적용(
      [
        줄({ sure: false, text: '쿠폰을 바꾸면 알림이 뜬다' }),
        줄({ op: 'EDIT', reqId: 'MKW-REQ-001', text: '3개월', sure: false }),
        줄({ op: 'DEL', reqId: 'MKW-REQ-002', sure: false }),
      ],
      [],
    );
    if ('error' in r) throw new Error(r.detail);
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-003')).toMatchObject({ status: 'NEEDS_CHECK', checkSince: 시각, text: '쿠폰을 바꾸면 알림이 뜬다' });
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-001')).toMatchObject({ status: 'NEEDS_CHECK', checkSince: 시각, text: '주문 내역은 최근 1개월 것을 보여 준다' });
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-001')!.basis[0]).toEqual({ from: 'DM-12', quote: '3개월' });
    expect(r.items.find((x) => x.reqId === 'MKW-REQ-002')).toMatchObject({ status: 'NEEDS_CHECK', text: '「1개월」 기간 버튼이 있다', fromIssues: ['DM-3', 'DM-12'] });
    expect(r.changes.map((c) => c.kind)).toEqual(['ADD', 'CHECK', 'CHECK']);
  });

  it('안 고른 확정 후보는 버린다 — 바뀐 것이 없다', () => {
    const r = 적용([줄({}), 줄({ op: 'EDIT', reqId: 'MKW-REQ-001', text: '3개월' })], []);
    if ('error' in r) throw new Error(r.detail);
    expect(r.바뀜).toBe(false);
    expect(r.items).toEqual(지금);
  });

  it('고른 수정 줄의 번호가 판에 없으면 BAD_PICK, 안 고른 것이면 건너뛴다', () => {
    expect(적용([줄({ op: 'EDIT', reqId: 'MKW-REQ-009', text: 'x' })], [0])).toEqual({ error: 'BAD_PICK', detail: 'draft:7' });
    const r = 적용([줄({ op: 'EDIT', reqId: 'MKW-REQ-009', text: 'x', sure: false })], []);
    expect('error' in r ? null : r.바뀜).toBe(false);
  });

  it('두 초안이 같은 요구를 차례로 고친다 — 앞 초안이 지운 번호를 뒤 초안이 고르면 BAD_PICK', () => {
    const 앞 = { key: 'draft:7', card: 카드([줄({ op: 'DEL', reqId: 'MKW-REQ-001' })]), picked: new Set([0]) };
    const 뒤 = { key: 'draft:8', card: 카드([줄({ op: 'EDIT', reqId: 'MKW-REQ-001', text: 'x' })]), picked: new Set([0]) };
    expect(초안적용(지금, 2, 'MKW', [앞, 뒤], 시각)).toEqual({ error: 'BAD_PICK', detail: 'draft:8' });
  });
});
