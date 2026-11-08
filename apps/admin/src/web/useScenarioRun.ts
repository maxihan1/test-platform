// 조립 화면의 정식 실행 — 저장 안 한 변경이 있으면 저장부터 하고, 기록 · 증적이 남는 실행을 걸어 결과로 옮긴다 (도메인/시나리오 §8.11 「조립」)

import { useState } from 'react';

import type { 모바일위치 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { 결과주소, type 들어온곳 } from './ScenarioResultNext.js';
import { message } from './ui.js';

// 새 것을 저장하고 실행하다 실행만 실패하면 저장된 주소로 옮겨 화면을 새로 그린다. 실패 문장이 그 사이에 사라지지 않게 넘긴다
let 넘길실행글: string | null = null;

// 새 시나리오를 저장하고 실행을 걸었으면 주소가 바뀌어 화면이 새로 그려진다. 지켜볼 실행 번호를 새 화면에 넘긴다
let 넘길실행번호: number | null = null;

/** 다시 그린 조립 화면이 처음 한 번 읽는다 — 저장하고 실행한 새 시나리오의 실행 번호 */
export function 넘겨받은실행번호(): number | null {
  const 번호 = 넘길실행번호;
  넘길실행번호 = null;
  return 번호;
}

/** 다시 그린 조립 화면이 처음 한 번 읽는다 */
export function 넘겨받은실행글(): string | null {
  const 글 = 넘길실행글;
  넘길실행글 = null;
  return 글;
}

export function useScenarioRun({
  id,
  어디서,
  on글,
  on새주소,
  창,
}: {
  /** 주면 실행을 건 뒤 결과 화면으로 옮기지 않고 이 실행을 같은 틀 창에서 지켜본다 (도메인/실행 §8.16 ⑥). 마법사는 안 준다 */
  창?: (runId: number) => void;
  id: number | null;
  /** 결과 화면의 돌아가기 — 조립 화면은 그 시나리오로, 마법사는 목록으로 (§8.11 「마법사」 저장하고 실행) */
  어디서: 들어온곳;
  on글: (글: string | null) => void;
  /** 저장은 됐는데 실행이 실패한 새 시나리오 — 주소를 옮기기 전에 넘길 것을 넘긴다 */
  on새주소: (새번호: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [실행중, set실행중] = useState(false);
  // 모바일 시나리오의 정식 실행 위치 — 조립 화면 머리의 덩이가 고른다. 마법사는 고르개가 없어 서버 흉내다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
  const [mobileOn, setMobileOn] = useState<모바일위치>('server');

  /** 걸기 전 검사. 막히면 사유를 글로 내고 false — 시작 확인 상자는 통과한 뒤에만 띄운다 */
  function 걸수있나(서버: string, 막는번호: number | null): boolean {
    // 잘못 적은 칸은 초안에 안 들어가 바뀜이 거짓일 수 있다 — 그대로 돌면 화면과 다른 옛 값으로 기록 · 증적이 남는다
    if (막는번호 !== null) {
      on글(t('{번호}번 단계의 잘못 적은 칸을 수정해야 실행할 수 있습니다', { 번호: 막는번호 }));
      return false;
    }
    if (서버 === '') {
      on글(t('실행할 대상 서버를 먼저 선택합니다'));
      return false;
    }
    on글(null);
    return true;
  }

  // 실행은 저장한 최신 버전으로만 돈다. 이름 · 단계는 저장이 보고 여기서는 잘못 적은 칸과 서버를 본다
  // 서버 · 초안은 불러온 뒤에야 알아 누를 때 받는다 — 훅은 이른 반환보다 먼저 불려야 한다
  async function 실행(서버: string, 바뀜: boolean, 막는번호: number | null, 저장: () => Promise<{ id: number } | null>) {
    if (!걸수있나(서버, 막는번호)) return;
    set실행중(true);
    let 새번호: number | null = null;
    try {
      let 번호 = id;
      if (id === null || 바뀜) {
        const 결과 = await 저장();
        if (결과 === null) return;
        번호 = 결과.id;
        if (id === null) 새번호 = 결과.id;
      }
      if (번호 === null) return;
      const { runId } = await scenarioApi.run(번호, 서버, mobileOn);
      // 자기 이동에 떠나기 상자를 띄우지 않는다 — 방금 저장해 잃을 것이 없다
      떠나기막기(null);
      if (창 !== undefined) {
        // 새 시나리오를 처음 저장했으면 주소가 바뀌어 화면을 새로 그린다 — 창이 그 새 화면에 서야 하므로 넘길 것을 넘기고 옮긴다
        if (새번호 !== null) {
          on새주소(새번호);
          넘길실행번호 = runId;
          window.location.hash = `#/scenarios/${새번호}`;
        } else 창(runId);
        return;
      }
      window.location.hash = 결과주소(runId, 어디서);
    } catch (err) {
      const 글 = message(err, 언어);
      if (새번호 === null) {
        on글(글);
        return;
      }
      // 새 시나리오 주소에 남으면 다음 저장이 같은 시나리오를 또 만든다
      on새주소(새번호);
      넘길실행글 = 글;
      떠나기막기(null);
      window.location.hash = `#/scenarios/${새번호}`;
    } finally {
      set실행중(false);
    }
  }

  return { 실행중, 실행, 걸수있나, 위치: { 값: mobileOn, on바꿈: setMobileOn } };
}
