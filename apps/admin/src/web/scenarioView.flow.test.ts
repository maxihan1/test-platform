import type { ScenarioLink } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 순서바꾸기, 후보단계들 } from './scenarioView.js';

const 주입: ScenarioLink = { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'id' } };

describe('AI 흐름 후보를 단계로 (도메인/시나리오 §3.7 결정 15)', () => {
  const 단계들 = 후보단계들({
    name: '첫 주문',
    why: '',
    reqIds: [],
    steps: [
      { tcId: 'MKF-FN-064', name: '로그인' },
      { tcId: 'MKF-FN-155', name: '담기' },
      { tcId: 'MKF-FN-200', name: '주문 상세' },
    ],
    links: [{ toSeq: 3, link: 주입, needs: [], why: '' }],
  });

  it('후보 차례 그대로 케이스 단계가 되고 값 연결은 받는 단계에만 달린다', () => {
    expect(단계들).toEqual([
      { kind: 'case', tcId: 'MKF-FN-064', params: {}, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'MKF-FN-155', params: {}, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'MKF-FN-200', params: {}, expected: {}, skipSteps: [], links: [주입] },
    ]);
  });

  it('차례를 바꿔도 같은 두 케이스를 잇는다', () => {
    const 바뀐 = 순서바꾸기(단계들, 1, 2);
    expect(바뀐[2]).toMatchObject({ tcId: 'MKF-FN-200', links: [{ value: { fromSeq: 2 } }] });
    expect(바뀐[1]).toMatchObject({ tcId: 'MKF-FN-064' });
  });
});
