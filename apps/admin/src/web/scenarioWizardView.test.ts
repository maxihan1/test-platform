import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import type { CasePartMaterial, TrialResult } from './scenarioApi.js';
import { 빼기 } from './scenarioView.js';
import { 멈춘한줄, 연결상태, 쓰였나, 이어받기적용, 제안합치기 } from './scenarioWizardView.js';

const 케이스 = (tcId: string, links?: ScenarioLink[]): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], ...(links === undefined ? {} : { links }) });
const 주입: ScenarioLink = { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'id' } };
const 차단: ScenarioLink = { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' };
const 재사용: ScenarioLink = { kind: 'reuse', method: 'GET', urlPattern: '**/api/me', fromSeq: 1 };

const 결과 = (part: TrialResult['parts'][number]): TrialResult => ({ status: part.status, durationMs: 10, parts: [{ seq: 1, status: 'PASS', durationMs: 5, steps: [], mocks: [] }, part] });

describe('제안합치기', () => {
  it('같은 두 케이스 · 같은 종류가 이미 있거나 지운 것은 달지 않는다', () => {
    const 고친 = { ...주입, value: { ...주입.value, jsonPath: 'data.id' } };
    const parts = [케이스('A-1'), 케이스('A-2', [고친])];
    expect(제안합치기(parts, [{ toSeq: 2, link: 주입, needs: [], why: '' }], new Set())).toEqual(parts);
    expect(제안합치기([케이스('A-1'), 케이스('A-2')], [{ toSeq: 2, link: 주입, needs: [], why: '' }], new Set(['A-2|A-1|bind']))[1]).toEqual(케이스('A-2'));
    expect(제안합치기([케이스('A-1'), 케이스('A-2')], [{ toSeq: 2, link: 주입, needs: [], why: '' }], new Set())[1]).toEqual(케이스('A-2', [주입]));
  });
});

describe('연결상태', () => {
  it('가져올 단계를 빼면 gone, 빈 칸이 남으면 blank', () => {
    const parts = [케이스('A-1'), 케이스('A-2'), 케이스('A-3', [{ ...주입, value: { ...주입.value, fromSeq: 2 } }])];
    expect(연결상태(parts, 3, (parts[2] as Extract<ScenarioPart, { kind: 'case' }>).links![0]!)).toBeNull();
    const 뺀 = 빼기(parts, 2);
    expect(연결상태(뺀, 2, (뺀[1] as Extract<ScenarioPart, { kind: 'case' }>).links![0]!)).toBe('gone');
    expect(연결상태(parts, 2, { ...주입, value: { ...주입.value, jsonPath: ' ' } })).toBe('blank');
  });
});

describe('이어받기적용', () => {
  const 재료 = new Map<string, CasePartMaterial | null>(
    ['A-1', 'A-2', 'B-1'].map((tcId) => [
      tcId,
      { tcId, name: tcId, platforms: ['desktop'], precondition: [], paramSchema: {}, expectedSchema: {}, steps: [{ title: '로그인한다', skippable: true }], r16: true, unconfirmed: null },
    ]),
  );
  it('켜면 같은 애플리케이션 앞 단계가 이미 실행한 사전 단계만 건너뛰고, 끄면 다 실행한다', () => {
    const parts = [케이스('A-1'), 케이스('B-1'), 케이스('A-2')];
    expect(이어받기적용(parts, 재료, true).map((p) => (p.kind === 'case' ? p.skipSteps : null))).toEqual([[], [], ['로그인한다']]);
    expect(이어받기적용(parts, 재료, false).map((p) => (p.kind === 'case' ? p.skipSteps : null))).toEqual([[], [], []]);
  });
});

describe('쓰였나', () => {
  it('값 주입은 bound 에 칸이 있어야 쓰임이다', () => {
    expect(쓰였나(결과({ seq: 2, status: 'PASS', durationMs: 5, steps: [], mocks: [], bound: { orderId: 3 } }), 2, 주입, 'ko')).toBe('쓰임');
    expect(쓰였나(결과({ seq: 2, status: 'PASS', durationMs: 5, steps: [], mocks: [] }), 2, 주입, 'ko')).toBe('안 쓰임');
  });

  it('나머지는 실패한 단계의 「적용되지 않은 값 연결」 꼬리로만 안 쓰임을 안다', () => {
    const 실패 = 결과({ seq: 2, status: 'FAIL', durationMs: 5, steps: [], mocks: [], error: { message: '버튼이 없다\n적용되지 않은 값 연결 — 요청 차단 DELETE **/api/cart' } });
    expect(쓰였나(실패, 2, 차단, 'ko')).toBe('안 쓰임');
    expect(쓰였나(실패, 2, 재사용, 'ko')).toBe('쓰임');
    expect(쓰였나(결과({ seq: 2, status: 'FAIL', durationMs: 5, steps: [], mocks: [], error: { message: '버튼이 없다' } }), 2, 차단, 'ko')).toBe('멈춤 · 쓰였는지는 결과에 남지 않습니다');
    expect(쓰였나(결과({ seq: 2, status: 'PASS', durationMs: 5, steps: [], mocks: [] }), 2, 차단, 'ko')).toBe('통과 · 쓰였는지는 결과에 남지 않습니다');
    expect(쓰였나(결과({ seq: 2, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: 'NOT_RUN' } }), 2, 차단, 'en')).toBe('Not run');
  });
});

describe('멈춘한줄', () => {
  const 확인 = (statement: string, status: 'PASS' | 'FAIL') => ({ statement, status, actual: false, expected: true });

  it('확인 문장이 틀려 멈췄으면 실패한 첫 확인 문장이다', () => {
    const part: TrialResult['parts'][number] = {
      seq: 2,
      status: 'FAIL',
      durationMs: 5,
      mocks: [],
      steps: [
        { seq: 5, title: '방해 요소를 막는다', status: 'PASS', durationMs: 1, assertions: [] },
        { seq: 6, title: '로그인하지 않은 상태인지 확인한다', status: 'FAIL', durationMs: 1, assertions: [확인('화면이 열린다', 'PASS'), 확인('로그인한 회원이 없다', 'FAIL')] },
      ],
    };
    expect(멈춘한줄(part, 'ko')).toBe('로그인한 회원이 없다');
  });

  it('확인 문장이 없으면 단계 오류의 첫 줄이고, 시간 초과는 사람 말로 바꾼다', () => {
    const 오류 = (message: string): TrialResult['parts'][number] => ({ seq: 2, status: 'FAIL', durationMs: 5, steps: [], mocks: [], error: { message } });
    expect(멈춘한줄(오류('버튼이 없다\n적용되지 않은 값 연결 — 요청 차단 DELETE **/api/cart'), 'ko')).toBe('버튼이 없다');
    expect(멈춘한줄(오류('TIMEOUT'), 'ko')).toBe('제한 시간 초과');
  });
});
