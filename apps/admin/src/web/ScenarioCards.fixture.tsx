// E2E 시나리오 단계 카드 검사들이 나눠 쓰는 도우미 — 단계 · 재료 자료와 카드 판 그리기

import type { ScenarioPart } from '@platform/kit';
import { useState } from 'react';
import type { Platform } from './api.js';
import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioCards } from './ScenarioCards.js';
import { ScenarioTabs, type 조립탭 } from './ScenarioTabs.js';
import type { 재료들 } from './scenarioView.js';

export const 케이스 = (tcId: string, 덮: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
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

export interface 판옵션 {
  단계들: ScenarioPart[];
  재료?: 재료들;
  쓰나?: boolean;
  이력있나?: boolean;
  디바이스?: Platform;
  고른번호?: number | null;
  탭?: 조립탭;
}

export const 기록 = { 단계들: [] as ScenarioPart[] };

export function 판({ 단계들: 처음, 재료: 재료표 = new Map(), 쓰나 = true, 이력있나 = true, 디바이스 = 'desktop', 고른번호: 처음고름 = null, 탭: 처음탭 = 'add' }: 판옵션) {
  const [단계들, set단계들] = useState(처음);
  const [고른, set고른] = useState<number | null>(처음고름);
  const [탭, set탭] = useState<조립탭>(처음탭);
  기록.단계들 = 단계들;
  return (
    <>
      <ScenarioCards
        단계들={단계들}
        단계들바꾸기={set단계들}
        재료={재료표}
        디바이스={디바이스}
        쓰나={쓰나}
        고른번호={고른}
        on고르기={set고른}
        on탭={set탭}
        시험요약={<p>시험 요약 자리</p>}
      />
      <ScenarioTabs 탭={탭} on탭={set탭} 고른번호={고른} 쓰나={쓰나} 이력있나={이력있나}>
        <p>탭 속</p>
      </ScenarioTabs>
    </>
  );
}

export const 고르기버튼 = (n: number) => document.querySelector(`[data-card="${n}"][data-act="pick"]`) as HTMLButtonElement;
