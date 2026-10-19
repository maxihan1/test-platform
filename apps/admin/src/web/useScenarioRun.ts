// 조립 화면의 정식 실행 — 저장 안 한 변경이 있으면 저장부터 하고, 기록 · 증적이 남는 실행을 걸어 결과로 옮긴다 (도메인/시나리오 §8.11 「조립」)

import { useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { 결과주소 } from './ScenarioResultNext.js';
import { message } from './ui.js';

// 새 것을 저장하고 실행하다 실행만 실패하면 저장된 주소로 옮겨 화면을 새로 그린다. 실패 문장이 그 사이에 사라지지 않게 넘긴다
let 넘길실행글: string | null = null;

/** 다시 그린 조립 화면이 처음 한 번 읽는다 */
export function 넘겨받은실행글(): string | null {
  const 글 = 넘길실행글;
  넘길실행글 = null;
  return 글;
}

export function useScenarioRun({
  id,
  on글,
  on새주소,
}: {
  id: number | null;
  on글: (글: string | null) => void;
  /** 저장은 됐는데 실행이 실패한 새 시나리오 — 주소를 옮기기 전에 넘길 것을 넘긴다 */
  on새주소: (새번호: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [실행중, set실행중] = useState(false);

  // 실행은 저장한 최신 버전으로만 돈다. 이름 · 단계 · 잘못 적은 칸은 저장이 보고 여기서는 서버만 본다
  // 서버 · 초안은 불러온 뒤에야 알아 누를 때 받는다 — 훅은 이른 반환보다 먼저 불려야 한다
  async function 실행(서버: string, 바뀜: boolean, 저장: () => Promise<{ id: number } | null>) {
    if (서버 === '') {
      on글(t('실행할 대상 서버를 먼저 고릅니다'));
      return;
    }
    on글(null);
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
      const { runId } = await scenarioApi.run(번호, 서버);
      // 자기 이동에 떠나기 상자를 띄우지 않는다 — 방금 저장해 잃을 것이 없다
      떠나기막기(null);
      window.location.hash = 결과주소(runId, 'scenario');
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

  return { 실행중, 실행 };
}
