// E2E 시나리오 타입 모양 검사 — 판정은 typecheck 가 한다. 틀린 모양은 @ts-expect-error 가 막히는지 본다 (SPEC 공통/3-공유계약 「E2E 시나리오 타입」)

import { describe, expect, it } from 'vitest';
import type {
  ScenarioExecuteRequest,
  ScenarioExecuteResponse,
  ScenarioPart,
  StepResult,
} from './types.js';

const 부품들: ScenarioPart[] = [
  { kind: 'case', tcId: 'AUTH-002', params: {}, expected: {}, skipSteps: ['계정을 만든다'] },
  { kind: 'api', method: 'POST', path: '/api/users', body: { name: 'a' }, expectStatus: 201 },
  { kind: 'mock', urlPattern: '**/api/pay', status: 500, contentType: 'application/json', body: '{}' },
  { kind: 'unmock', urlPattern: '**/api/pay' },
  { kind: 'wait', ms: 1000 },
];

const 시험실행: ScenarioExecuteRequest = {
  runId: null,
  trialId: '0b7e2c1a-0000-4000-8000-000000000000',
  platform: 'mobile',
  baseUrl: 'http://localhost:3002',
  parts: [{ ...부품들[0]!, filePath: 'auth/login.spec.ts' }, 부품들[4]!],
  timeoutMs: 300000,
};

const 건너뛴절차: StepResult = {
  seq: 1, title: '계정을 만든다', status: 'PASS', durationMs: 0, assertions: [], skipped: true,
};

const 응답: ScenarioExecuteResponse = {
  status: 'FAIL',
  durationMs: 1200,
  parts: [
    { seq: 1, status: 'FAIL', durationMs: 1200, steps: [건너뛴절차], mocks: [], error: { message: 'TIMEOUT' } },
    { seq: 2, status: 'NA', durationMs: 0, steps: [], mocks: ['**/api/pay'], error: { message: 'NOT_RUN' } },
  ],
};

// @ts-expect-error — wait 부품은 ms 가 있어야 한다
const 틀린대기: ScenarioPart = { kind: 'wait' };
// @ts-expect-error — 메서드는 다섯 중 하나다
const 틀린메서드: ScenarioPart = { kind: 'api', method: 'HEAD', path: '/', expectStatus: 200 };
// @ts-expect-error — skipped 는 true 만 적는다. 안 건너뛰었으면 칸이 없다
const 틀린건너뜀: StepResult = { ...건너뛴절차, skipped: false };

describe('E2E 시나리오 타입', () => {
  it('계약 블록의 모양이 그대로 선다', () => {
    const 모양 = [부품들, 시험실행, 건너뛴절차, 응답, 틀린대기, 틀린메서드, 틀린건너뜀];
    expect(모양).toHaveLength(7);
    expect(부품들.map((p) => p.kind)).toEqual(['case', 'api', 'mock', 'unmock', 'wait']);
  });
});
