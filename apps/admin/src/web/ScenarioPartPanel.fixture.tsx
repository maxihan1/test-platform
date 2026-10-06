// E2E 시나리오 케이스 단계 설정 패널 검사들이 나눠 쓰는 도우미 — 단계 · 재료 자료와 패널 그리기

import type { ScenarioPart } from '@platform/kit';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import type { 재료들 } from './scenarioView.js';

export type 케이스단계 = Extract<ScenarioPart, { kind: 'case' }>;

export const 단계 = (tcId: string, 덮: Partial<케이스단계> = {}): 케이스단계 => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...덮,
});

export const 재료 = (tcId: string, 덮: Partial<CasePartMaterial> = {}): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
  ...덮,
});

export const 준비있는 = (tcId: string) =>
  재료(tcId, {
    r16: true,
    steps: [
      { title: '로그인한다', skippable: true },
      { title: '장바구니를 비운다', skippable: true },
      { title: '결제한다', skippable: false },
    ],
  });

export function 그리기(
  현재: 케이스단계,
  재: CasePartMaterial | null,
  옵션: { 쓰나?: boolean; 번호?: number; 단계들?: ScenarioPart[]; 재료맵?: 재료들 } = {},
) {
  const on바꿈 = vi.fn();
  const on케이스바꾸기 = vi.fn();
  const 맵: 재료들 = 옵션.재료맵 ?? new Map([[현재.tcId, 재]]);
  render(
    <ScenarioPartPanel
      번호={옵션.번호 ?? 1}
      단계={현재}
      단계들={옵션.단계들 ?? [현재]}
      재료={맵}
      쓰나={옵션.쓰나 ?? true}
      on바꿈={on바꿈}
      on케이스바꾸기={on케이스바꾸기}
    />,
  );
  return { on바꿈, on케이스바꾸기 };
}

export const 마지막바꿈 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as 케이스단계;
