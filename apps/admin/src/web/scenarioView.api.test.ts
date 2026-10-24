import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 가리킴빈곳, 빼기, 순서바꾸기 } from './scenarioView.js';

const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const 호출 = (fromSeq: number): ScenarioPart => ({
  kind: 'api', method: 'GET', path: '/api/orders/{id}', expectStatus: 200,
  values: [{ name: 'id', value: { fromSeq, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'id' } }],
});
const 주입번호 = (p: ScenarioPart | undefined): number[] => (p?.kind === 'api' ? (p.values ?? []).map((v) => v.value.fromSeq) : []);

describe('API 호출 단계의 값 주입 번호 (FIX-F4-05 · M11)', () => {
  const 만든다 = (): ScenarioPart[] => [케이스('주문 생성'), 케이스('장바구니'), 호출(1)];

  it('순서바꾸기 — 가리키던 단계를 따라간다', () => {
    const r = 순서바꾸기(만든다(), 2, 1);
    expect(r.map((p) => (p.kind === 'case' ? p.tcId : p.kind))).toEqual(['장바구니', '주문 생성', 'api']);
    expect(주입번호(r[2])).toEqual([2]);
  });

  it('빼기 — 뒤 번호는 당기고 뺀 단계를 가리키던 것은 0 이다', () => {
    expect(주입번호(빼기(만든다(), 2)[1])).toEqual([1]);
    expect(주입번호(빼기(만든다(), 1)[1])).toEqual([0]);
  });

  it('가리킴빈곳 — 빠졌거나 뒤로 간 단계를 가리키면 그 API 단계 번호를 모은다. 앞의 API 호출 단계는 된다', () => {
    expect(가리킴빈곳(빼기(만든다(), 1))).toEqual([2]);
    expect(가리킴빈곳([호출(2), 케이스('주문 생성')])).toEqual([1]);
    expect(가리킴빈곳([케이스('주문 생성'), { kind: 'wait', ms: 1 }, 호출(2)])).toEqual([3]);
    expect(가리킴빈곳([케이스('주문 생성'), 호출(1), 호출(2)])).toEqual([]);
  });
});
