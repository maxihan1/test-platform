// PRD 초안 꼴 검사 — 줄 종류 · 요구 번호 · 같은 번호 두 줄 · 맡은 이슈 · E2E 제안 (도메인/BTS 「PRD 초안 → 결정 필요」)

import { describe, expect, it } from 'vitest';

import { 상한 } from '../prd/rules.js';

import { 맡은키들, 초안검사, 초안상한, 초안있나 } from './draft.js';

const 키 = new Set(['DM-12', 'DM-13']);
const 번호 = new Set(['MKW-COUPON-03', 'MKW-COUPON-04']);
const 앱 = new Set(['MKW', 'MKO', 'MKA']);
const 줄 = (덧: object = {}) => ({ op: 'EDIT', reqId: 'MKW-COUPON-03', text: '최소 주문 금액은 2만 원이다', basis: 'DM-12 본문 「최소 금액 2만 원으로」', issueKeys: ['DM-12'], sure: true, ...덧 });
const 검사 = (몸: unknown) => 초안검사(몸, 키, 번호, 앱);

describe('초안검사', () => {
  it('새로 · 바뀜 · 지움 줄과 「? 확인」 줄을 받는다', () => {
    const 몸 = {
      rows: [
        줄(),
        { op: 'ADD', text: '쿠폰은 한 주문에 하나만 쓴다', basis: 'DM-13 본문', issueKeys: ['DM-13'], sure: true },
        { op: 'DEL', reqId: 'MKW-COUPON-04', text: '중복 쿠폰 허용 규칙을 지운다', basis: 'DM-13 본문', issueKeys: ['DM-13'], sure: true },
        { op: 'ADD', text: '쿠폰 목록이 금액 순으로 선다', basis: 'QA 화면에서만 봄 — 이슈 글에 없음', issueKeys: ['DM-12'], sure: false },
      ],
    };
    const 판정 = 검사(몸);
    expect(판정.ok).toBe(true);
    if (판정.ok) {
      expect(판정.초안.rows).toHaveLength(4);
      expect(판정.초안.rows[1]).not.toHaveProperty('reqId');
    }
  });

  it('바뀐 게 없는 애플리케이션은 빈 줄로 낸다', () => {
    expect(검사({ rows: [] })).toEqual({ ok: true, 초안: { rows: [] } });
  });

  it('같은 요구 번호를 두 줄이 건드리면 거절한다 — 이슈 둘은 한 줄로 합쳐야 한다', () => {
    expect(검사({ rows: [줄(), 줄({ issueKeys: ['DM-13'], op: 'DEL' })] })).toEqual({ ok: false, error: 'BAD_DRAFT', detail: 'rows.1.reqId 겹침' });
    expect(검사({ rows: [줄({ issueKeys: ['DM-12', 'DM-13'] })] }).ok).toBe(true);
  });

  it('바뀜 · 지움은 지금 PRD 에 있는 번호여야 하고 새로는 번호를 안 단다', () => {
    expect(검사({ rows: [줄({ reqId: 'MKW-COUPON-99' })] })).toMatchObject({ detail: 'rows.0.reqId' });
    expect(검사({ rows: [줄({ reqId: undefined })] })).toMatchObject({ detail: 'rows.0.reqId' });
    expect(검사({ rows: [줄({ op: 'ADD' })] })).toMatchObject({ detail: 'rows.0.reqId' });
  });

  it('맡지 않은 이슈 키 · 빈 근거 · 참거짓이 아닌 sure · 모르는 종류는 거절한다', () => {
    expect(검사({ rows: [줄({ issueKeys: ['DM-99'] })] })).toMatchObject({ detail: 'rows.0.issueKeys' });
    expect(검사({ rows: [줄({ issueKeys: [] })] })).toMatchObject({ detail: 'rows.0.issueKeys' });
    expect(검사({ rows: [줄({ issueKeys: ['DM-12', 'DM-12'] })] })).toMatchObject({ detail: 'rows.0.issueKeys' });
    expect(검사({ rows: [줄({ basis: ' ' })] })).toMatchObject({ detail: 'rows.0.basis' });
    expect(검사({ rows: [줄({ sure: 'yes' })] })).toMatchObject({ detail: 'rows.0.sure' });
    expect(검사({ rows: [줄({ op: 'MOVE' })] })).toMatchObject({ detail: 'rows.0.op' });
    expect(검사({ rows: [줄({ text: 'x'.repeat(초안상한.글 + 1) })] })).toMatchObject({ detail: 'rows.0.text' });
    expect(검사({ rows: [줄({ text: 'x'.repeat(상한.요구문장 + 1) })] })).toMatchObject({ detail: 'rows.0.text' });
    expect(검사({ rows: [줄({ text: 'x'.repeat(상한.요구문장) })] }).ok).toBe(true);
  });

  it('몸 꼴이 틀리면 거절한다', () => {
    expect(검사(null)).toMatchObject({ detail: 'rows' });
    expect(검사({ rows: [], more: 1 })).toMatchObject({ detail: 'body' });
    expect(검사({ rows: Array.from({ length: 초안상한.줄 + 1 }, () => ({})) })).toMatchObject({ detail: 'rows.length' });
  });

  it('E2E 제안은 그 프로젝트 애플리케이션 둘 이상을 잇고 단계 글이 있어야 한다', () => {
    const e2e = { title: '운영툴에서 바꾼 최소 금액이 웹 결제에 걸린다', services: ['MKO', 'MKW'], steps: ['운영툴에서 쿠폰 최소 금액을 2만 원으로', '웹에서 1만 5천 원 주문에 쿠폰을 건다'], issueKeys: ['DM-12'] };
    expect(검사({ rows: [], e2e: [e2e] })).toMatchObject({ ok: true });
    expect(검사({ rows: [], e2e: [{ ...e2e, services: ['MKW'] }] })).toMatchObject({ detail: 'e2e.0.services' });
    expect(검사({ rows: [], e2e: [{ ...e2e, services: ['MKW', 'MKW'] }] })).toMatchObject({ detail: 'e2e.0.services' });
    expect(검사({ rows: [], e2e: [{ ...e2e, services: ['MKW', 'ZZZ'] }] })).toMatchObject({ detail: 'e2e.0.services' });
    expect(검사({ rows: [], e2e: [{ ...e2e, steps: [] }] })).toMatchObject({ detail: 'e2e.0.steps' });
    expect(검사({ rows: [], e2e: [{ ...e2e, issueKeys: ['DM-1'] }] })).toMatchObject({ detail: 'e2e.0.issueKeys' });
  });
});

describe('초안있나 · 맡은키들', () => {
  it('result.draft.rows 가 목록일 때만 초안이 있다', () => {
    expect(초안있나({ draft: { rows: [] } })).toBe(true);
    expect(초안있나(null)).toBe(false);
    expect(초안있나({ version: 3 })).toBe(false);
  });

  it('params 의 이슈 키에서 글만 고른다', () => {
    expect(맡은키들({ issueKeys: ['DM-1', 3, 'DM-2'] })).toEqual(['DM-1', 'DM-2']);
    expect(맡은키들({})).toEqual([]);
  });
});
