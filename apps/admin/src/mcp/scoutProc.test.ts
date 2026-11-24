// e2e_result 의 부품 한 줄이 프로시저 단계에서 procId · procName · cases 를 싣고 Blocked 를 실패로 말하지 않는지 본다. 순수 함수라 DB 를 쓰지 않는다

import { describe, expect, it } from 'vitest';

import type { ScenarioRunPart } from '../web/scenarioApi.js';
import { E2E부품 } from './scout.js';

const 부품 = (덮: Partial<ScenarioRunPart>): ScenarioRunPart => ({
  seq: 1,
  kind: 'case',
  tcId: 'MTA-FN-101',
  tcName: '글쓰기',
  part: { kind: 'case', tcId: 'MTA-FN-101', params: {}, expected: {}, skipSteps: [] },
  status: 'FAIL',
  durationMs: 9000,
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
  trace: null,
  ...덮,
});

describe('E2E부품', () => {
  it('프로시저 단계는 프로시저 번호 · 이름과 케이스마다 판정을 싣고 Blocked 는 NA 에 blockedBy 로 말한다', () => {
    const 줄 = E2E부품(
      부품({
        procId: 'MTA-TP-022',
        procName: '글쓰기 흐름',
        cases: [
          { tcId: 'MTA-FN-100', name: '로그인', status: 'PASS', durationMs: 1000 },
          { tcId: 'MTA-FN-101', name: '글쓰기', status: 'FAIL', error: { message: 'x' } },
          { tcId: 'MTA-FN-102', name: '글 지우기', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-101' },
          { tcId: 'MTA-FN-103', name: '로그아웃' },
        ],
      }),
    );
    expect(줄).toMatchObject({ procId: 'MTA-TP-022', procName: '글쓰기 흐름' });
    expect((줄 as { cases: unknown[] }).cases).toEqual([
      { tcId: 'MTA-FN-100', name: '로그인', status: 'PASS' },
      { tcId: 'MTA-FN-101', name: '글쓰기', status: 'FAIL' },
      { tcId: 'MTA-FN-102', name: '글 지우기', status: 'NA', blockedBy: 'MTA-FN-101' },
      { tcId: 'MTA-FN-103', name: '로그아웃', status: 'NA' },
    ]);
  });

  it('프로시저가 아닌 부품은 지금 칸 일곱뿐이다', () => {
    expect(Object.keys(E2E부품(부품({}))).sort()).toEqual(['durationMs', 'failure', 'kind', 'name', 'seq', 'status', 'tcId']);
  });
});
