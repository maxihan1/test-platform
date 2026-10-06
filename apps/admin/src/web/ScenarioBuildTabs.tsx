// E2E 시나리오 조립 화면 오른쪽 탭의 속 — 단계 추가 · 시험 결과 · 고른 단계의 설정. 어느 것을 그릴지만 정하고 상태는 화면이 쥔다 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import type { ReactNode } from 'react';

import { ScenarioLinks } from './ScenarioLinks.js';
import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';
import { ScenarioPalette } from './ScenarioPalette.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import type { 조립탭 } from './ScenarioTabs.js';
import type { useScenarioDraft } from './useScenarioDraft.js';

export function ScenarioBuildTabs({
  탭,
  쓰나,
  초안,
  고른번호,
  바꿀번호,
  on케이스,
  on다른단계,
  on바꾸기취소,
  on케이스바꾸기,
  on바꿈,
  시험,
}: {
  탭: 조립탭;
  쓰나: boolean;
  초안: ReturnType<typeof useScenarioDraft>;
  고른번호: number | null;
  바꿀번호: number | null;
  on케이스: (tcId: string) => void;
  on다른단계: (part: ScenarioPart) => void;
  on바꾸기취소: () => void;
  on케이스바꾸기: () => void;
  on바꿈: (새단계: ScenarioPart) => void;
  시험: ReactNode;
}) {
  if (탭 === 'add' && 쓰나) {
    return (
      <ScenarioPalette
        서비스={초안.서비스}
        디바이스={초안.디바이스}
        바꿀번호={바꿀번호}
        on케이스={on케이스}
        on다른단계={on다른단계}
        on바꾸기취소={on바꾸기취소}
      />
    );
  }
  if (탭 === 'trial' && 쓰나) return <>{시험}</>;
  const 고른단계 = 고른번호 === null ? undefined : 초안.단계들[고른번호 - 1];
  if (탭 !== 'settings' || 고른번호 === null || 고른단계 === undefined) return null;
  if (고른단계.kind !== 'case') {
    return <ScenarioOtherPanel 번호={고른번호} 단계={고른단계} 단계들={초안.단계들} 쓰나={쓰나} on바꿈={on바꿈} />;
  }
  return (
    <ScenarioPartPanel
      번호={고른번호}
      단계={고른단계}
      단계들={초안.단계들}
      재료={초안.재료}
      쓰나={쓰나}
      on바꿈={on바꿈}
      on케이스바꾸기={on케이스바꾸기}
      값연결={
        <ScenarioLinks
          번호={고른번호}
          단계={고른단계}
          단계들={초안.단계들}
          재료={초안.재료}
          쓰나={쓰나}
          on바꿈={(links) => on바꿈({ ...고른단계, links })}
        />
      }
    />
  );
}
