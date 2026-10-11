// E2E 시나리오 조립 화면 오른쪽 탭의 속 — 단계 추가 · 시험 결과 · 변경 이력 · 고른 단계의 설정. 어느 것을 그릴지만 정하고 상태는 화면이 쥔다 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { useState, type ReactNode } from 'react';

import { ScenarioLinks } from './ScenarioLinks.js';
import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';
import { ScenarioPalette } from './ScenarioPalette.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import type { 조립탭 } from './ScenarioTabs.js';
import { ScenarioVersions } from './ScenarioVersions.js';
import { 뒤케이스 } from './scenarioView.js';
import type { useScenarioDraft } from './useScenarioDraft.js';

interface Props {
  id: number | null;
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
  on되돌림: () => void;
  on칸오류: (번호: number, 있나: boolean) => void;
  시험: ReactNode;
}

export function ScenarioBuildTabs(props: Props) {
  const { 탭, 쓰나, 초안, 바꿀번호, on케이스, on다른단계, on바꾸기취소 } = props;
  // 팔레트는 단계 추가 탭을 한 번 연 뒤로는 그려 두고 가리기만 한다. 내리면 단계를 넣을 때마다 케이스 목록을 처음부터 다시 받고
  // 찾기 글자가 지워진다. 한 번도 안 열었으면 안 그린다 — 설정만 보는 사람이 목록을 20쪽씩 받을 까닭이 없다
  const [열었나, set열었나] = useState(탭 === 'add');
  if (탭 === 'add' && !열었나) set열었나(true);
  return (
    <>
      {!쓰나 || !열었나 ? null : (
        <div hidden={탭 !== 'add'}>
          <ScenarioPalette
            서비스={초안.서비스}
            디바이스={초안.디바이스}
            바꿀번호={바꿀번호}
            // 중간 단계를 바꾸는 중에는 맨 뒤 기준 추천이 안 맞는다
            뒤={바꿀번호 === null ? 뒤케이스(초안.단계들) : null}
            on케이스={on케이스}
            on다른단계={on다른단계}
            on바꾸기취소={on바꾸기취소}
          />
        </div>
      )}
      {탭 === 'add' ? null : <TabBody {...props} />}
    </>
  );
}

function TabBody({
  id,
  탭,
  쓰나,
  초안,
  고른번호,
  on케이스바꾸기,
  on바꿈,
  on되돌림,
  on칸오류,
  시험,
}: Props) {
  if (탭 === 'trial' && 쓰나) return <>{시험}</>;
  if (탭 === 'history' && id !== null) {
    return (
      <ScenarioVersions
        id={id}
        버전들={초안.버전들}
        재료={초안.재료}
        쓰나={쓰나}
        바뀜={초안.바뀜}
        on되돌림={on되돌림}
      />
    );
  }
  const 고른단계 = 고른번호 === null ? undefined : 초안.단계들[고른번호 - 1];
  if (탭 !== 'settings' || 고른번호 === null || 고른단계 === undefined) return null;
  if (고른단계.kind !== 'case') {
    return (
      <ScenarioOtherPanel
        key={초안.판}
        번호={고른번호}
        단계={고른단계}
        단계들={초안.단계들}
        쓰나={쓰나}
        on바꿈={on바꿈}
        on칸오류={on칸오류}
      />
    );
  }
  return (
    <ScenarioPartPanel
      key={초안.판}
      번호={고른번호}
      단계={고른단계}
      단계들={초안.단계들}
      재료={초안.재료}
      쓰나={쓰나}
      on바꿈={on바꿈}
      on케이스바꾸기={on케이스바꾸기}
      값연결={(보일단계, 잠금) => (
        <ScenarioLinks
          번호={고른번호}
          단계={보일단계}
          단계들={초안.단계들}
          재료={초안.재료}
          쓰나={쓰나 && !잠금}
          on바꿈={(links) => on바꿈({ ...고른단계, links })}
        />
      )}
    />
  );
}
