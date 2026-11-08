// 로그인 이어받기 — 첫 절차는 같은 애플리케이션 앞 단계에 같은 제목이 있을 때만 건너뛴다 (SPEC 도메인/시나리오 §3.7 결정 4 · 5)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 점검 } from './checks.js';
import { type 카탈로그, 건너뛸수있나, 조립검사 } from './validate.js';

const 로그인 = '일반 회원으로 로그인해 목록을 연다';

const 재료: 카탈로그 = new Map([
  ['DMA-001', { platforms: ['desktop'], isActive: true, skippable: [], carry: 로그인, titles: [로그인, '상품을 연다'], params: [] }],
  ['DMA-002', { platforms: ['desktop'], isActive: true, skippable: [], carry: 로그인, titles: [로그인, '장바구니를 연다'], params: [] }],
  ['DMB-001', { platforms: ['desktop'], isActive: true, skippable: [], carry: 로그인, titles: [로그인], params: [] }],
]);

const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps });

describe('건너뛸수있나', () => {
  it('앞 단계에 같은 제목이 있으면 첫 절차를 건너뛸 수 있다', () => {
    const parts = [케이스('DMA-001'), 케이스('DMA-002', [로그인])];
    expect(건너뛸수있나(parts, 1, 재료, 로그인)).toBe(true);
    expect(조립검사(parts, 'desktop', 'DMA', 재료)).toEqual([]);
    expect(점검(parts, 재료).checks).toEqual([]);
  });

  it('앞 단계가 없으면 첫 절차를 건너뛸 수 없다 — 저장은 400 · 저장된 조립은 확인 필요', () => {
    const parts = [케이스('DMA-002', [로그인])];
    expect(건너뛸수있나(parts, 0, 재료, 로그인)).toBe(false);
    expect(조립검사(parts, 'desktop', 'DMA', 재료)).toEqual([`1번 단계: 「${로그인}」 은 건너뛸 수 있는 절차가 아니다`]);
    expect(점검(parts, 재료).checks).toEqual([{ seq: 1, reason: 'STEP_GONE' }]);
  });

  it('다른 애플리케이션 단계의 같은 제목은 세지 않는다 — 출처가 다르면 로그인이 안 넘어간다', () => {
    const parts = [케이스('DMB-001'), 케이스('DMA-002', [로그인])];
    expect(건너뛸수있나(parts, 1, 재료, 로그인)).toBe(false);
  });

  it('첫 절차가 아닌 제목은 앞 단계에 있어도 건너뛸 수 없다', () => {
    const parts = [케이스('DMA-002'), 케이스('DMA-001', ['상품을 연다'])];
    expect(건너뛸수있나(parts, 1, 재료, '상품을 연다')).toBe(false);
  });
});
