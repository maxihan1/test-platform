// 조립 화면이 저장본을 열 때 지금 건너뛸 수 없는 제목을 빼는지 검사한다 (도메인/시나리오 §3.7 결정 8)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import type { CasePartMaterial } from './scenarioApi.js';
import type { 재료들 } from './scenarioView.js';
import { 못건너뛸제목빼기 } from './useScenarioDraft.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;

const 케이스 = (tcId: string, extra: Partial<CasePart> = {}): CasePart => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], ...extra,
});
const 재료 = (steps: CasePartMaterial['steps']): CasePartMaterial => ({
  tcId: 'X', name: 'x', platforms: ['desktop'], precondition: [], paramSchema: {}, expectedSchema: {}, steps, r16: true, unconfirmed: null,
});

describe('못건너뛸제목빼기', () => {
  const 모음: 재료들 = new Map<string, CasePartMaterial | null>([
    ['A-1', 재료([{ title: '로그인한다', skippable: false }, { title: '담는다', skippable: true }])],
    ['C-1', null],
  ]);

  it('지금 건너뛸 수 없는 제목만 빼고 건너뛸 수 있는 제목 · 사라진 제목은 둔다', () => {
    const 부품: ScenarioPart[] = [케이스('A-1', { skipSteps: ['로그인한다', '담는다', '사라진 절차'] })];
    expect(못건너뛸제목빼기(부품, 모음)).toEqual([케이스('A-1', { skipSteps: ['담는다', '사라진 절차'] })]);
  });
  it('뺄 것이 없거나 재료가 없거나 케이스 단계가 아니면 그대로 둔다', () => {
    const 부품: ScenarioPart[] = [케이스('A-1', { skipSteps: ['담는다'] }), 케이스('C-1', { skipSteps: ['로그인한다'] }), 케이스('Z-1', { skipSteps: ['로그인한다'] }), { kind: 'wait', ms: 1 }];
    const 결과 = 못건너뛸제목빼기(부품, 모음);
    결과.forEach((p, i) => expect(p).toBe(부품[i]));
  });
});

