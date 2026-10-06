// E2E 시나리오 값 연결 편집 검사들이 나눠 쓰는 도우미 — 단계 · 재료 자료와 그리기

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioLinks } from './ScenarioLinks.js';
import type { 재료들 } from './scenarioView.js';

export type 케이스단계 = Extract<ScenarioPart, { kind: 'case' }>;

export const 단계 = (tcId: string, links?: ScenarioLink[]): 케이스단계 => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...(links === undefined ? {} : { links }),
});

export const 재료 = (tcId: string, 칸: string[]): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: Object.fromEntries(칸.map((k) => [k, { type: 'string' }])) },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

export const api: ScenarioPart = { kind: 'api', method: 'GET', path: '/x', expectStatus: 200 };
export const 참조 = { fromSeq: 1, method: 'POST', urlPattern: '/api/orders', jsonPath: '$.id' } as const;

export function 그리기(links: ScenarioLink[] | undefined, 옵션: { 쓰나?: boolean; 앞?: ScenarioPart[] } = {}) {
  const 앞 = 옵션.앞 ?? [단계('ZSB-001'), api];
  const 현재 = 단계('ZSB-003', links);
  const 맵: 재료들 = new Map([['ZSB-003', 재료('ZSB-003', ['orderId', 'memo'])]]);
  const on바꿈 = vi.fn();
  render(
    <ScenarioLinks
      번호={앞.length + 1}
      단계={현재}
      단계들={[...앞, 현재]}
      재료={맵}
      쓰나={옵션.쓰나 ?? true}
      on바꿈={on바꿈}
    />,
  );
  return { on바꿈 };
}

export const 마지막 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as ScenarioLink[];
export const 칸수 = (묶음: HTMLElement) => 묶음.querySelectorAll('input, select').length;
