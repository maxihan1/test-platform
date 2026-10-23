// E2E 마법사 「값 연결」 단계의 상태 — 값 연결마다 한 줄 · 확인 · 지운 제안 · 로그인 이어받기, 그리고 그것을 푼 보낼 단계들

import type { ScenarioPart } from '@platform/kit';
import { useMemo, useState } from 'react';

import type { FlowCandidate } from './scenarioApi.js';
import type { 재료들 } from './scenarioView.js';
import type { 연결메모 } from './ScenarioWizardValues.js';
import { 연결들, 연결상태, 연결열쇠, 이어받기적용 } from './scenarioWizardView.js';

export function useWizardValues(단계들: ScenarioPart[], 재료: 재료들) {
  const [메모, set메모] = useState<Map<string, 연결메모>>(new Map());
  // 사람이 지운 제안은 「값 연결」에 다시 들어와도 또 달지 않는다
  const [지운, set지운] = useState<ReadonlySet<string>>(new Set());
  const [이어받기, set이어받기] = useState(true);
  // 로그인 이어받기는 보낼 때 단계마다 건너뛸 사전 단계로 푼다 — 재료가 늦게 와도 그때의 계산이 맞다
  const 보낼 = useMemo(() => 이어받기적용(단계들, 재료, 이어받기), [단계들, 재료, 이어받기]);
  const 연결 = 연결들(단계들);

  /** AI 후보를 고를 때 — 후보 값 연결의 한 줄을 남긴다. JSON 경로가 찬 것은 AI 가 짐작한 것이다(빈 채로 오면 needs 에 든다) */
  function 후보메모(후보: FlowCandidate, 새단계: ScenarioPart[]) {
    set메모((앞) => {
      const 새 = new Map(앞);
      for (const l of 후보.links) 새.set(연결열쇠(새단계, l.toSeq, l.link), { why: l.why, AI: !l.needs.includes('jsonPath'), 확인: false });
      return 새;
    });
  }

  return {
    칸: {
      메모,
      set메모,
      지운,
      on지움: (열쇠: string) => set지운((앞) => new Set(앞).add(열쇠)),
      이어받기,
      on이어받기: set이어받기,
    },
    보낼,
    연결수: 연결.length,
    미확인: 연결.filter((c) => 메모.get(연결열쇠(단계들, c.받는번호, c.link))?.확인 !== true).length,
    막힘: 연결.some((c) => 연결상태(단계들, c.받는번호, c.link) !== null),
    후보메모,
  };
}
