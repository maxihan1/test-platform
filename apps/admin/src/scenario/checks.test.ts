// 저장된 조립을 지금 카탈로그에 대 본다 — 「확인 필요」와 실행 가능 여부 (SPEC 도메인/시나리오 §3.7 결정 8)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 점검 } from './checks.js';
import type { 카탈로그 } from './validate.js';

const 재료: 카탈로그 = new Map([
  ['SHOP-001', { platforms: ['desktop'], isActive: true, skippable: ['상품을 담는다'], params: [] }],
  ['SHOP-003', { platforms: ['desktop'], isActive: false, skippable: ['상품을 담는다'], params: [] }],
]);

const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps,
});

describe('점검', () => {
  it('건너뛸 제목이 지금도 건너뛸 수 있으면 점검이 없다', () => {
    expect(점검([케이스('SHOP-001', ['상품을 담는다'])], 재료)).toEqual({ checks: [], needsCheck: false, runnable: true });
  });

  it('건너뛸 제목이 지금 skippable 에 없으면 STEP_GONE 이고 실행은 된다', () => {
    expect(점검([케이스('SHOP-001'), 케이스('SHOP-001', ['사라진 절차'])], 재료)).toEqual({
      checks: [{ seq: 2, reason: 'STEP_GONE' }],
      needsCheck: true,
      runnable: true,
    });
  });

  it('케이스가 비활성이거나 없으면 CASE_INACTIVE 이고 실행 불가다', () => {
    expect(점검([케이스('SHOP-003', ['상품을 담는다']), 케이스('SHOP-999')], 재료)).toEqual({
      checks: [
        { seq: 1, reason: 'CASE_INACTIVE' },
        { seq: 2, reason: 'CASE_INACTIVE' },
      ],
      needsCheck: true,
      runnable: false,
    });
  });

  it('케이스 아닌 부품은 점검하지 않는다', () => {
    const parts: ScenarioPart[] = [
      { kind: 'wait', ms: 10 },
      { kind: 'unmock', urlPattern: '**' },
      { kind: 'api', method: 'GET', path: '//x', expectStatus: 200 },
    ];
    expect(점검(parts, 재료)).toEqual({ checks: [], needsCheck: false, runnable: true });
  });

  it('제한 시간 합이 60분을 넘거나 부품 목록이 크기 상한을 넘으면 실행 불가다 — checks 는 그대로다', () => {
    const 길다: ScenarioPart[] = Array.from({ length: 13 }, () => 케이스('SHOP-001'));
    expect(점검(길다, 재료)).toEqual({ checks: [], needsCheck: false, runnable: false });
    const 크다: ScenarioPart[] = [
      { kind: 'mock', urlPattern: '**', status: 200, contentType: 'text/plain', body: 'x'.repeat(100001) },
    ];
    expect(점검(크다, 재료)).toEqual({ checks: [], needsCheck: false, runnable: false });
  });
});
