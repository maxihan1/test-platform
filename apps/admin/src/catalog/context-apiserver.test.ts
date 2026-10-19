// 케이스 목록의 API 서버 꼬리표 — 이름을 붙이고 · 거르고 · 칩 건수를 세는 순수 부분 (도메인/카탈로그 §8.1 「API 서버」)

import { describe, expect, it } from 'vitest';

import { API서버세기, 맥락, 맥락거르기, 맥락조건읽기, 맥락짓기 } from './context.js';

const 표 = 맥락짓기({
  prd: [],
  reqs: [{ reqId: 'XAT-REQ-001', tcId: 'XAT-FN-001', axis: '정상' }],
  screens: [],
  apis: [
    { tcId: 'XAT-FN-001', name: '결제' },
    { tcId: 'XAT-FN-001', name: '인증' },
    { tcId: 'XAT-FN-001', name: '결제' },
    { tcId: 'XAT-FN-002', name: '인증' },
  ],
});
const 전부 = ['XAT-FN-001', 'XAT-FN-002', 'XAT-FN-003'];

describe('API 서버 꼬리표', () => {
  it('이름은 글자 순으로 한 번씩만 붙고 · 요구가 없는 케이스도 표에 든다 · 안 부른 케이스는 빈 목록이다', () => {
    expect(맥락(표, 'XAT-FN-001').apiServers).toEqual(['결제', '인증']);
    expect(맥락(표, 'XAT-FN-002').apiServers).toEqual(['인증']);
    expect(맥락(표, 'XAT-FN-003').apiServers).toEqual([]);
  });

  it('apis 를 안 넘기면(실패 요구사항 쪽) 이름 없이 짓는다', () => {
    const 요구만 = 맥락짓기({ prd: [], reqs: [{ reqId: 'R', tcId: 'XAT-FN-001', axis: '정상' }], screens: [] });
    expect(맥락(요구만, 'XAT-FN-001').apiServers).toEqual([]);
  });

  it('거르기는 그 이름이 붙은 케이스만 · 모르는 이름은 빈 목록 · 안 주면 안 거른다', () => {
    expect(맥락거르기(전부, 표, { apiServer: '인증' })).toEqual(['XAT-FN-001', 'XAT-FN-002']);
    expect(맥락거르기(전부, 표, { apiServer: '결제' })).toEqual(['XAT-FN-001']);
    expect(맥락거르기(전부, 표, { apiServer: '옛이름' })).toEqual([]);
    expect(맥락거르기(전부, 표, {})).toEqual(전부);
  });

  it('칩 건수는 이름마다 맞은 케이스 수 — 0건인 이름도 낸다', () => {
    expect(API서버세기(['XAT-FN-001', 'XAT-FN-002'], 표, ['결제', '인증', '주문'])).toEqual([
      { name: '결제', count: 1 },
      { name: '인증', count: 2 },
      { name: '주문', count: 0 },
    ]);
  });

  it('쿼리 읽기: 빈 값은 안 거르고 · 배열이면 마지막 값을 쓴다', () => {
    expect(맥락조건읽기({ apiServer: '' })).toEqual({});
    expect(맥락조건읽기({ apiServer: '인증' })).toEqual({ apiServer: '인증' });
    expect(맥락조건읽기({ apiServer: ['인증', '결제'] })).toEqual({ apiServer: '결제' });
  });
});
