// E2E 마법사 뒤 두 단계의 상태 — 대상 서버 고르기 · 시험 실행(지금 조립의 결과만) · 저장 · 저장하고 실행 (도메인/시나리오 §8.11 「마법사」)

import type { ScenarioPart } from '@platform/kit';
import { useState } from 'react';

import type { Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { scenarioApi } from './scenarioApi.js';
import { 시험막는글 } from './ScenarioTrial.js';
import { 서버선택지, type 앱줄 } from './scenarioView.js';
import { message } from './ui.js';
import { useScenarioRun } from './useScenarioRun.js';
import { useScenarioTrial, 시험열쇠, type 시험상태 } from './useScenarioTrial.js';

interface 입력 {
  서비스: string;
  디바이스: Platform;
  이름: string;
  /** 로그인 이어받기까지 푼 보낼 단계들 */
  보낼: ScenarioPart[];
  앱들: readonly 앱줄[];
  /** 바닥에 막는 까닭을 띄운다. null 이면 지운다 */
  on까닭: (까닭: string | null) => void;
}

export function useWizardEnd({ 서비스, 디바이스, 이름, 보낼, 앱들, on까닭 }: 입력) {
  const t = use말();
  const 언어 = use언어();
  const [고른서버, set고른서버] = useState<string | null>(null);
  const [시험지문, set시험지문] = useState('');
  const [시험글, set시험글] = useState<string | null>(null);
  const [서버열기, set서버열기] = useState(false);
  const [저장중, set저장중] = useState(false);
  const [저장됨, set저장됨] = useState<{ id: number; version: number; 이름: string } | null>(null);
  const 시험원본 = useScenarioTrial(시험열쇠(null));
  const 정식 = useScenarioRun({ id: null, 어디서: 'scenarios', on글: on까닭, on새주소: () => undefined });

  const 서버들 = 서버선택지(앱들, 서비스, 보낼);
  const 가능 = 서버들.filter((s) => s.없는곳.length === 0);
  const 서버후보 = 고른서버 ?? 마지막서버(서비스, 가능);
  const 서버 = 가능.some((s) => s.env === 서버후보) ? 서버후보 : '';
  // 앞 단계에서 단계를 바꿨으면 그 시험 결과는 지금 조립의 것이 아니다
  const 시험: 시험상태 =
    시험원본.단계 !== 'idle' && 시험지문 !== JSON.stringify(보낼) ? { ...시험원본, 단계: 'idle', 결과: null, 오류문장: null } : 시험원본;

  function 서버고름(env: string) {
    set고른서버(env);
    고른서버를적는다(서비스, env);
  }

  function 시험시작() {
    const 사유 = 시험막는글(t, 서버, 보낼, null);
    set시험글(사유);
    if (사유 !== null) return;
    고른서버를적는다(서비스, 서버);
    set시험지문(JSON.stringify(보낼));
    void 시험원본.시작({ service: 서비스, env: 서버, platform: 디바이스, parts: 보낼 });
  }

  async function 만들기(): Promise<{ id: number; version: number } | null> {
    set저장중(true);
    try {
      return await scenarioApi.create({ service: 서비스, name: 이름.trim(), platform: 디바이스, parts: 보낼 });
    } catch (err) {
      on까닭(message(err, 언어));
      return null;
    } finally {
      set저장중(false);
    }
  }

  /** 막혔으면 까닭(번역 전 글자)을 돌려준다 — 부르는 쪽이 바닥을 흔든다 */
  async function 저장(실행: boolean): Promise<string | null> {
    if (저장중 || 정식.실행중) return null;
    if (이름.trim() === '') return '시나리오 이름을 적어야 저장할 수 있습니다';
    if (실행 && 서버 === '') {
      // 시험 실행 단계로 데려가지 않고 저장 단계에 고르개를 연다
      set서버열기(true);
      return '대상 서버를 먼저 고릅니다';
    }
    on까닭(null);
    if (실행) {
      await 정식.실행(서버, true, null, 만들기);
      return null;
    }
    const 결과 = await 만들기();
    if (결과 !== null) set저장됨({ ...결과, 이름: 이름.trim() });
    return null;
  }

  return {
    시험,
    시험글,
    서버들,
    서버,
    서버고름,
    미리: 고른서버 === null && 서버 !== '',
    시험시작,
    저장,
    저장중: 저장중 || 정식.실행중,
    저장됨,
    서버열기: 서버열기 && 서버 === '',
  };
}
