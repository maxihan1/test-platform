// E2E 실행 결과 화면 검사들이 나눠 쓰는 도우미 — 단계 · 결과 자료와 화면 그리기

import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { scenarioApi, type ScenarioRunPart, type ScenarioRunResult } from './scenarioApi.js';
import { ScenarioResult } from './ScenarioResult.js';

export const 사진길 = (seq: number) => `/api/runs/77/scenario/screenshots/${seq}`;

export function 부품(seq: number, 덮: Partial<ScenarioRunPart>): ScenarioRunPart {
  return {
    seq,
    kind: 'case',
    tcId: `XSX-00${seq}`,
    tcName: `케이스 ${seq}`,
    part: { kind: 'case', tcId: `XSX-00${seq}`, params: {}, expected: {}, skipSteps: [] },
    status: 'PASS',
    durationMs: 500,
    skippedSteps: [],
    mocks: [],
    paramSchema: null,
    expectedSchema: null,
    precondition: [],
    unconfirmed: null,
    bound: {},
    cleanup: [],
    steps: [],
    error: null,
    ...덮,
  };
}

export const 로그인 = 부품(1, {
  tcName: '로그인 확인',
  part: { kind: 'case', tcId: 'XSX-001', params: { id: 'kim', password: 'hunter2' }, expected: {}, skipSteps: [], carryOver: false },
  paramSchema: { type: 'object', properties: { id: { description: '아이디' }, password: { description: '비밀번호', secret: true } } },
  steps: [{ seq: 1, title: '로그인', status: 'PASS', durationMs: 100, assertions: [] }],
});
export const 모킹켜기 = 부품(2, {
  kind: 'mock', tcId: null, tcName: null,
  part: { kind: 'mock', urlPattern: '**/api/pay', status: 500, contentType: 'application/json', body: '{}' },
});
export const 결제 = 부품(3, {
  tcName: '결제 확인',
  part: {
    kind: 'case', tcId: 'XSX-003', params: {}, expected: {}, skipSteps: ['로그인'],
    links: [{ kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/orders', jsonPath: '$.id' } }],
  },
  status: 'FAIL',
  mocks: ['**/api/pay'],
  skippedSteps: ['로그인'],
  bound: { orderId: 812 },
  unconfirmed: '화면에서 읽은 값입니다',
  cleanup: [{ method: 'DELETE', url: '/api/orders/812', status: 204 }, { method: 'DELETE', url: '/api/x', error: 'ECONNRESET' }],
  steps: [
    { seq: 4, title: '결제 화면 열기', status: 'PASS', durationMs: 10, assertions: [] },
    { seq: 5, title: '결제 버튼 누르기', status: 'FAIL', durationMs: 10, assertions: [] },
  ],
  error: { message: '기대와 다릅니다\n둘째 줄' },
});
export const 안돈 = 부품(4, {
  kind: 'api', tcId: null, tcName: null,
  part: { kind: 'api', method: 'GET', path: '/api/orders', expectStatus: 200 },
  status: 'NA', durationMs: null, error: { message: 'NOT_RUN' },
});

export function 결과(덮: Partial<ScenarioRunResult> = {}): ScenarioRunResult {
  return {
    scenarioId: 12, version: 3, status: 'FINISHED', platform: 'desktop', title: '결제 시나리오',
    env: 'qa', baseUrl: 'https://qa.example.com', triggeredBy: 'kim', triggeredByName: '김검사',
    startedAt: '2026-10-06T00:00:00.000Z', finishedAt: '2026-10-06T00:00:12.000Z',
    parts: [로그인, 모킹켜기, 결제, 안돈], ...덮,
  };
}

export function 연다(답: ScenarioRunResult, 상자안 = false) {
  const 부름 = vi.spyOn(scenarioApi, 'result').mockResolvedValue(답);
  render(<ScenarioResult runId={77} 상자안={상자안} />);
  return 부름;
}

export const 줄 = (이름: string) => screen.getByText(이름).closest('.scn-part') as HTMLElement;
