// API 애플리케이션 케이스 목록의 엔드포인트 — 붙이고 · 묶고 · 거르는 순수 부분 (도메인/카탈로그 §8.1 「맥락」 · WEB-F7-22)

import { describe, expect, it } from 'vitest';

import { 맥락, 맥락거르기, 맥락조건읽기, 맥락짓기, 줄세우기 } from './context.js';

const 표 = 맥락짓기({
  prd: [{ reqId: 'XCE-REQ-001', feature: '주문', text: '주문을 만든다' }],
  reqs: [
    { reqId: 'XCE-REQ-001', tcId: 'XCE-FN-001', axis: '예외' },
    { reqId: 'XCE-REQ-001', tcId: 'XCE-FN-002', axis: '정상' },
    { reqId: 'XCE-REQ-001', tcId: 'XCE-FN-003', axis: '정상' },
    { reqId: 'XCE-REQ-001', tcId: 'XCE-FN-004', axis: '정상' },
  ],
  screens: [],
  endpoints: [
    { tcId: 'XCE-FN-001', method: 'POST', path: '/api/auth/login', step: null },
    { tcId: 'XCE-FN-001', method: 'POST', path: '/api/orders', step: 2 },
    { tcId: 'XCE-FN-001', method: 'GET', path: '/api/orders/:n', step: 3 },
    { tcId: 'XCE-FN-002', method: 'GET', path: '/api/orders/:n', step: 1 },
    { tcId: 'XCE-FN-002', method: 'GET', path: '/api/orders/:n', step: 4 },
    { tcId: 'XCE-FN-003', method: 'POST', path: '/api/orders', step: 1 },
  ],
});

describe('API 케이스 엔드포인트', () => {
  it('단계에서 먼저 부른 것이 앞이고 · 준비에서만 부른 것은 뒤 · 주소가 달라도 메서드 · 경로가 같으면 한 번', () => {
    expect(맥락(표, 'XCE-FN-001').endpoints).toEqual(['POST /api/orders', 'GET /api/orders/:n', 'POST /api/auth/login']);
    expect(맥락(표, 'XCE-FN-002').endpoints).toEqual(['GET /api/orders/:n']);
    expect(맥락(표, 'XCE-FN-004').endpoints).toEqual([]);
  });

  it('endpoints 를 안 넘기면(웹 · 실패 요구사항) 빈 목록이다', () => {
    const 요구만 = 맥락짓기({ prd: [], reqs: [{ reqId: 'R', tcId: 'XCE-FN-001', axis: '정상' }], screens: [] });
    expect(맥락(요구만, 'XCE-FN-001').endpoints).toEqual([]);
  });

  it('묶음은 맨 앞 엔드포인트 · 경로 차례로 서고 · 엔드포인트 없는 케이스는 묶음 맨 앞이다', () => {
    const { 차례, groups } = 줄세우기(['XCE-FN-001', 'XCE-FN-002', 'XCE-FN-003', 'XCE-FN-004'], 표);
    expect(차례).toEqual(['XCE-FN-004', 'XCE-FN-001', 'XCE-FN-003', 'XCE-FN-002']);
    expect(groups.map((g) => [g.endpoint, g.tcIds])).toEqual([
      [null, ['XCE-FN-004']],
      ['POST /api/orders', ['XCE-FN-001', 'XCE-FN-003']],
      ['GET /api/orders/:n', ['XCE-FN-002']],
    ]);
  });

  it('거르기는 묶인 엔드포인트만 — 케이스가 부른 다른 엔드포인트로는 안 걸린다', () => {
    const 전부 = ['XCE-FN-001', 'XCE-FN-002', 'XCE-FN-003', 'XCE-FN-004'];
    expect(맥락거르기(전부, 표, { endpoint: 'GET /api/orders/:n' })).toEqual(['XCE-FN-002']);
    expect(맥락거르기(전부, 표, { endpoint: 'POST /api/orders' })).toEqual(['XCE-FN-001', 'XCE-FN-003']);
  });

  it('쿼리 읽기: 빈 값은 안 거르고 · 배열이면 마지막 값을 쓴다', () => {
    expect(맥락조건읽기({ endpoint: '' })).toEqual({});
    expect(맥락조건읽기({ endpoint: ['GET /a', 'POST /b'] })).toEqual({ endpoint: 'POST /b' });
  });
});
