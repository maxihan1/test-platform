// E2E AI 흐름 후보 — 재료 짓기(디바이스 · 정상 쪽 · 메뉴 링크 · 상한)와 결과 다듬기(없는 번호 · 겹친 번호 · 값 연결은 지도 제안과 맞을 때만) (도메인/시나리오 §3.7 결정 15)

import { describe, expect, it } from 'vitest';

import { type AI후보, 재료짓기, 케이스상한, 흐름다듬기, type 재료원천 } from './flowSuggest.js';
import type { 지도요청 } from './linkSuggest.js';

const 원천 = (덧: Partial<재료원천> = {}): 재료원천 => ({
  platform: 'desktop',
  wish: null,
  prd: [{ reqId: 'MKT-REQ-001', feature: '주문', text: '주문한다' }, { reqId: 'MKT-REQ-002', feature: '주문', text: '수량은 1~99' }],
  케이스들: [
    { tcId: 'MKT-FN-001', name: '주문하기', platforms: ['desktop'], techniques: [] },
    { tcId: 'MKT-FN-002', name: '수량 경계', platforms: ['desktop', 'mobile'], techniques: [] },
    { tcId: 'MKT-FN-003', name: '앱 전용', platforms: ['mobile'], techniques: [] },
  ],
  맥락: new Map([
    ['MKT-FN-001', { reqs: [{ reqId: 'MKT-REQ-001', axis: '정상' }], screens: [{ url: 'http://shop.test/orders/12' }, { url: null }] }],
    ['MKT-FN-002', { reqs: [{ reqId: 'MKT-REQ-002', axis: '경계' }], screens: [] }],
  ]),
  PRD씀: true,
  연결들: [
    { state: '로그인', from: '/', to: '/orders', via: '링크 「주문」' },
    { state: '로그아웃', from: '/', to: '/orders', via: '링크 「주문」' },
  ],
  ...덧,
});

describe('재료짓기', () => {
  it('고른 디바이스의 케이스만 담고 정상 쪽 · 요구 · 화면 틀을 단다', () => {
    const 재료 = 재료짓기(원천());
    expect(재료.cases).toEqual([
      { tcId: 'MKT-FN-001', name: '주문하기', reqIds: ['MKT-REQ-001'], screens: ['/orders/:n'], normal: true },
      { tcId: 'MKT-FN-002', name: '수량 경계', reqIds: ['MKT-REQ-002'], screens: [], normal: false },
    ]);
    expect(재료.reqs).toEqual([
      { reqId: 'MKT-REQ-001', feature: '주문', kinds: ['정상'], text: '주문한다' },
      { reqId: 'MKT-REQ-002', feature: '주문', kinds: ['경계'], text: '수량은 1~99' },
    ]);
    expect(재료.links).toEqual([{ from: '/', to: '/orders', via: '링크 「주문」' }]);
    expect(재료.truncated).toBe(false);
  });

  it('머리 · 바닥 메뉴 링크는 뺀다', () => {
    const 화면 = ['/', '/a', '/b', '/c'];
    const 연결들 = [
      ...화면.map((from) => ({ state: '로그인', from, to: '/cart', via: '링크 「장바구니 2」' })),
      { state: '로그인', from: '/a', to: '/b', via: '버튼 「다음」' },
    ];
    expect(재료짓기(원천({ 연결들 })).links).toEqual([{ from: '/a', to: '/b', via: '버튼 「다음」' }]);
  });

  it('상한을 넘으면 앞에서부터 담고 truncated 를 단다', () => {
    const 케이스들 = Array.from({ length: 케이스상한 + 1 }, (_, i) => ({ tcId: `MKT-FN-${i}`, name: '케이스', platforms: ['desktop'], techniques: [] }));
    const 재료 = 재료짓기(원천({ 케이스들 }));
    expect(재료.cases).toHaveLength(케이스상한);
    expect(재료.truncated).toBe(true);
  });
});

describe('흐름다듬기', () => {
  const 재료 = {
    reqs: [{ reqId: 'MKT-REQ-001', feature: '주문', kinds: ['정상'], text: '주문한다' }],
    cases: ['001', '002', '003'].map((n) => ({ tcId: `MKT-FN-${n}`, name: `케이스 ${n}`, reqIds: [], screens: [], normal: true })),
  };
  const 줄 = (method: string, path: string, ...tcIds: string[]): 지도요청 => ({ method, path, cases: tcIds.map((tcId) => ({ tcId })) });
  const 지도 = new Map([['MKT', [줄('POST', '/api/orders', 'MKT-FN-001'), 줄('GET', '/api/orders/:n', 'MKT-FN-003')]]]);
  const 입력칸 = new Map([['MKT-FN-003', ['orderId', 'shopId']]]);
  const 후보 = (덧: Partial<AI후보>): AI후보 => ({ name: '주문 흐름', why: '주문이 끝까지 간다', tcIds: [], reqIds: [], links: [], ...덧 });

  it('재료에 없는 번호와 겹친 번호를 빼고, 남은 단계가 둘보다 적은 후보는 버린다', () => {
    const 결과 = 흐름다듬기(재료, [
      후보({ tcIds: ['MKT-FN-001', 'MKT-FN-999', 'MKT-FN-001', 'MKT-FN-002'], reqIds: ['MKT-REQ-001', 'MKT-REQ-404'] }),
      후보({ name: '버릴 것', tcIds: ['MKT-FN-001', 'MKT-FN-998'] }),
    ], 지도, 입력칸);
    expect(결과).toEqual([{
      name: '주문 흐름', why: '주문이 끝까지 간다', reqIds: ['MKT-REQ-001'],
      steps: [{ tcId: 'MKT-FN-001', name: '케이스 001' }, { tcId: 'MKT-FN-002', name: '케이스 002' }],
      links: [],
    }]);
  });

  it('지도 제안이 같은 두 단계에 있으면 JSON 경로와 있는 입력값 칸만 채우고 번호는 남은 차례로 바꾼다', () => {
    const [하나] = 흐름다듬기(재료, [후보({
      tcIds: ['MKT-FN-001', 'MKT-FN-404', 'MKT-FN-003'],
      links: [{ fromSeq: 1, toSeq: 3, param: 'orderId', jsonPath: ' data.id ' }],
    })], 지도, 입력칸);
    expect(하나?.links).toEqual([expect.objectContaining({
      toSeq: 2,
      link: { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: 'data.id' } },
      needs: [],
    })]);
  });

  it('맞는 제안이 없는 짐작은 버리고, 없는 입력값 칸은 비운 채 needs 에 남긴다', () => {
    const [하나] = 흐름다듬기(재료, [후보({
      tcIds: ['MKT-FN-001', 'MKT-FN-002', 'MKT-FN-003'],
      links: [{ fromSeq: 1, toSeq: 2, jsonPath: 'id' }, { fromSeq: 1, toSeq: 3, param: 'nope', jsonPath: 'id' }],
    })], 지도, 입력칸);
    expect(하나?.links).toEqual([expect.objectContaining({
      toSeq: 3,
      link: expect.objectContaining({ kind: 'bind', param: '' }),
      needs: ['param'],
    })]);
  });
});
