// E2E 프로시저 단계의 순수 규칙 — 조립 400 둘 · 제한 시간 몫 · 확인 필요 사유 둘 · 후보를 프로시저마다 하나로 줄이기 (SPEC 도메인/시나리오 §3.7 결정 17)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 점검 } from './checks.js';
import { 재료짓기, type 재료원천 } from './flowSuggest.js';
import { 프로시저로줄인다 } from './next.js';
import { 프로시저몫, 프로시저하나씩 } from './procStep.js';
import { type 카탈로그, 시나리오제한시간, 제한시간크기사유, 조립검사, 프로시저수 } from './validate.js';

const 프로시저 = (procId: string, tcIds: string[]) => ({ procId, procName: `${procId} 흐름`, cases: tcIds.map((tcId) => ({ tcId, name: `${tcId} 이름` })) });
const 앱케이스 = (proc?: ReturnType<typeof 프로시저>) => ({
  platforms: ['android' as const],
  isActive: true,
  skippable: [],
  titles: ['앱을 켠다'],
  params: [],
  ...(proc === undefined ? {} : { proc }),
});

const 재료: 카탈로그 = new Map([
  ['APP-FN-101', 앱케이스(프로시저('APP-TP-001', ['APP-FN-101', 'APP-UI-102', 'APP-FN-103']))],
  ['APP-FN-103', 앱케이스(프로시저('APP-TP-001', ['APP-FN-101', 'APP-UI-102', 'APP-FN-103']))],
  ['APP-FN-201', 앱케이스(프로시저('APP-TP-002', ['APP-FN-201']))],
  ['APP-FN-301', { ...앱케이스(), skippable: ['앱을 켠다'] }],
]);

const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps });
const 검사 = (parts: ScenarioPart[]) => 조립검사(parts, 'android', 'APP', 재료, ['APP'], new Map([['APP', 'APP' as const]]));

describe('프로시저 단계 조립 검사', () => {
  it('프로시저 안 케이스 하나씩이면 통과한다 — 옛 꼴 케이스 단계의 건너뛰기도 그대로 된다', () => {
    expect(검사([케이스('APP-FN-101'), 케이스('APP-FN-201'), 케이스('APP-FN-301', ['앱을 켠다'])])).toEqual([]);
  });

  it('같은 프로시저의 케이스가 둘이면 둘째 단계를 400 으로 거절한다', () => {
    expect(검사([케이스('APP-FN-101'), 케이스('APP-FN-201'), 케이스('APP-FN-103')])).toEqual([
      '3번 단계: APP-FN-103 는 1번 단계와 같은 프로시저(APP-TP-001 흐름)의 케이스다 — 프로시저는 한 시나리오에 한 번만 넣는다',
    ]);
  });

  it('프로시저 단계에 건너뛸 제목이 있으면 400 이다', () => {
    expect(검사([케이스('APP-FN-101', ['앱을 켠다'])])).toEqual(['1번 단계: 프로시저 단계는 건너뛸 절차를 걸 수 없다 — 프로시저가 시작 상태를 스스로 맞춘다']);
  });
});

describe('프로시저 단계의 제한 시간', () => {
  it('프로시저 단계는 케이스 수 × 120000 + 180000 이고 케이스가 하나면 케이스 부품 몫 300000 과 같다', () => {
    expect(프로시저몫(3)).toBe(540000);
    expect(프로시저몫(1)).toBe(300000);
    const parts = [케이스('APP-FN-101'), 케이스('APP-FN-201'), 케이스('APP-FN-301')];
    expect(시나리오제한시간(parts, 프로시저수(재료))).toBe(540000 + 300000 + 300000);
    expect(시나리오제한시간(parts)).toBe(900000);
  });

  it('60분을 넘으면 사유에 프로시저 단계 몫이 늘어난다는 말이 붙는다 — 프로시저 단계가 없으면 지금 글 그대로다', () => {
    const 긴 = 프로시저수(new Map([['APP-FN-101', 앱케이스(프로시저('APP-TP-001', Array.from({ length: 30 }, (_, i) => `APP-FN-${100 + i}`)))]]));
    const 사유 = 제한시간크기사유([케이스('APP-FN-101'), 케이스('APP-FN-301')], 긴);
    expect(사유).toEqual(['단계가 많아 제한 시간 합이 68분으로 한도 60분을 넘습니다 — 케이스 단계(하나에 5분)나 프로시저 단계(케이스 하나마다 2분이 더 든다)나 API 호출 · 대기를 줄여 주세요']);
    expect(제한시간크기사유(Array.from({ length: 13 }, () => 케이스('APP-FN-301')))).toEqual([
      '단계가 많아 제한 시간 합이 65분으로 한도 60분을 넘습니다 — 케이스 단계(하나에 5분)나 API 호출 · 대기를 줄여 주세요',
    ]);
  });
});

describe('프로시저 단계 점검', () => {
  it('두 단계의 케이스가 같은 프로시저면 PROC_DUP, 저장된 건너뛸 제목이 있으면 PROC_SKIP 이고 둘 다 실행은 된다', () => {
    expect(점검([케이스('APP-FN-101'), 케이스('APP-FN-103', ['앱을 켠다'])], 재료)).toEqual({
      checks: [
        { seq: 2, reason: 'PROC_DUP' },
        { seq: 2, reason: 'PROC_SKIP' },
      ],
      needsCheck: true,
      runnable: true,
    });
  });

  it('프로시저 단계의 사라진 제목은 STEP_GONE 이 아니라 PROC_SKIP 이다 — 옛 꼴 케이스는 그대로 STEP_GONE', () => {
    expect(점검([케이스('APP-FN-201', ['지운 제목']), 케이스('APP-FN-301', ['지운 제목'])], 재료).checks).toEqual([
      { seq: 1, reason: 'PROC_SKIP' },
      { seq: 2, reason: 'STEP_GONE' },
    ]);
  });
});

describe('프로시저마다 후보 하나', () => {
  const 후보 = (tcId: string, procId?: string, procSeq?: number) => ({ tcId, ...(procId === undefined ? {} : { procId, procSeq }) });

  it('프로시저 안 차례가 가장 앞인 하나만 남기고 옛 꼴 케이스는 그대로 둔다', () => {
    expect(프로시저하나씩([후보('A-FN-3', 'A-TP-1', 3), 후보('A-FN-1', 'A-TP-1', 1), 후보('A-FN-9'), 후보('A-FN-5', 'A-TP-2', 1)])).toEqual([
      후보('A-FN-1', 'A-TP-1', 1),
      후보('A-FN-9'),
      후보('A-FN-5', 'A-TP-2', 1),
    ]);
  });

  it('이미 시나리오에 든 프로시저의 후보는 하나도 안 낸다', () => {
    expect(프로시저하나씩([후보('A-FN-3', 'A-TP-1', 3), 후보('A-FN-5', 'A-TP-2', 1)], new Set(['A-TP-1']))).toEqual([후보('A-FN-5', 'A-TP-2', 1)]);
  });

  it('다음 단계 추천은 앞 케이스의 프로시저를 빼고 나머지는 프로시저마다 하나에 procId 를 단다', () => {
    const 소속 = new Map([
      ['A-FN-1', { procId: 'A-TP-1', procSeq: 1 }],
      ['A-FN-2', { procId: 'A-TP-1', procSeq: 2 }],
      ['A-FN-5', { procId: 'A-TP-2', procSeq: 2 }],
      ['A-FN-6', { procId: 'A-TP-2', procSeq: 1 }],
    ]);
    const 후보들 = ['A-FN-1', 'A-FN-2', 'A-FN-5', 'A-FN-6', 'A-FN-9'].map((tcId) => ({ tcId, screen: '/x' }));
    expect(프로시저로줄인다(후보들, 소속, 'A-TP-1')).toEqual([
      { tcId: 'A-FN-6', screen: '/x', procId: 'A-TP-2' },
      { tcId: 'A-FN-9', screen: '/x' },
    ]);
  });

  it('AI 흐름 후보 재료도 프로시저마다 하나만 담는다', () => {
    const 원천: 재료원천 = {
      platform: 'android',
      wish: null,
      game: false,
      prd: [],
      케이스들: [
        { tcId: 'A-FN-2', name: '둘째', platforms: ['android'], techniques: [], params: [], procId: 'A-TP-1', procSeq: 2 },
        { tcId: 'A-FN-1', name: '첫째', platforms: ['android'], techniques: [], params: [], procId: 'A-TP-1', procSeq: 1 },
        { tcId: 'A-FN-9', name: '옛 꼴', platforms: ['android'], techniques: [], params: [], procId: null, procSeq: null },
      ],
      맥락: new Map(),
      PRD씀: false,
      연결들: [],
    };
    expect(재료짓기(원천).cases.map((c) => c.tcId)).toEqual(['A-FN-1', 'A-FN-9']);
  });
});
