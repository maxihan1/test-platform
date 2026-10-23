// E2E 마법사가 케이스 단계마다 받는 재료(사전 단계 · 입력값 모양) — 케이스마다 한 번만 부른다

import { useEffect, useRef, useState } from 'react';

import { use언어 } from './i18n.js';
import type { 재료들 } from './scenarioView.js';
import { message } from './ui.js';
import { 재료읽기 } from './useScenarioDraft.js';

export function useWizardMaterial(tcIds: string[]): { 재료: 재료들; 오류: string | null } {
  const 언어 = use언어();
  const [재료, set재료] = useState<재료들>(new Map());
  const [오류, set오류] = useState<string | null>(null);
  const 부른 = useRef(new Set<string>());
  // 배열은 그릴 때마다 새것이라 글자로 바꿔 의존에 넣는다
  const 열쇠 = [...new Set(tcIds)].join('\n');

  useEffect(() => {
    for (const n of 열쇠 === '' ? [] : 열쇠.split('\n')) {
      if (부른.current.has(n)) continue;
      부른.current.add(n);
      재료읽기(n).then(
        (값) => set재료((앞) => new Map(앞).set(n, 값)),
        (err: unknown) => {
          // 지워 두어야 단계를 다시 바꿀 때 또 불러 본다
          부른.current.delete(n);
          set오류(message(err, 언어));
        },
      );
    }
  }, [열쇠, 언어]);

  return { 재료, 오류 };
}
