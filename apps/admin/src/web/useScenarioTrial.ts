// E2E 시나리오 시험 실행의 상태 — 시작 · 2초마다 묻기 · sessionStorage 에 시험 번호 두기 · 화면을 다시 열면 이어 묻기

import type { ScenarioPart } from '@platform/kit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi, type TrialResult } from './scenarioApi.js';
import { message } from './ui.js';
import { 단계쌓기, type 쌓인단계 } from './useTrialQueue.js';

export interface 시험상태 {
  단계: 'idle' | 'running' | 'done' | 'failed';
  trialId: string | null;
  env: string;
  결과: TrialResult | null;
  오류문장: string | null;
  /** 돌린 때의 단계. 결과에는 번호만 있어 실행 뒤 초안을 고치면 줄 이름이 다른 단계로 붙는다. null 은 모른다 */
  단계들: ScenarioPart[] | null;
  /** VISION 이 폰을 잡은 동안 그 폰 화면 주소. 폰을 놓으면 서버가 안 싣는다 */
  vision: string | null;
  /** 잡은 폰의 모델 이름. 팜이 안 주면 없다 */
  폰이름: string | null;
  /** 러너가 알린 지금 단계들을 본 순서로 쌓은 것 — 끝난 단계가 걸린 시간을 이것으로 낸다 (실행 창 왼쪽 목록) */
  지금단계들: 쌓인단계[];
  /** 시작을 누른 시각(ms). 이어 묻는 시험은 저장해 둔 값이다 */
  시작시각: number | null;
  /** 사람이 중단을 눌렀다. 결과가 올 때까지 창이 「중단하는 중」을 적는다 */
  중단함: boolean;
}

export interface 시험본문 {
  service: string;
  env: string;
  platform: Platform;
  parts: ScenarioPart[];
}

const 묻는간격 = 2000;
const 비어있다: 시험상태 = { 단계: 'idle', trialId: null, env: '', 결과: null, 오류문장: null, 단계들: null, vision: null, 폰이름: null, 지금단계들: [], 시작시각: null, 중단함: false };

interface 저장값 {
  trialId: string;
  env: string;
  parts?: ScenarioPart[];
  시작?: number;
}

export const 시험열쇠 = (id: number | null) => 'scn-trial:' + String(id ?? 'new');

// 저장소가 막힌 브라우저에서도 화면이 돌아야 해서 읽기 · 쓰기를 전부 감싼다. 잃는 것은 이어 묻기뿐이다
function 읽기(열쇠: string): 저장값 | null {
  try {
    const 글 = sessionStorage.getItem(열쇠);
    if (글 === null) return null;
    const 값: unknown = JSON.parse(글);
    if (typeof 값 !== 'object' || 값 === null) return null;
    const { trialId, env, parts, 시작 } = 값 as Record<string, unknown>;
    if (typeof trialId !== 'string' || typeof env !== 'string') return null;
    // 단계는 이 화면이 적은 것이다. 없으면 이름을 지금 초안으로 붙인다
    return {
      trialId,
      env,
      ...(Array.isArray(parts) ? { parts: parts as ScenarioPart[] } : {}),
      ...(typeof 시작 === 'number' ? { 시작 } : {}),
    };
  } catch {
    return null;
  }
}

function 쓰기(열쇠: string, 값: 저장값 | null) {
  try {
    if (값 === null) sessionStorage.removeItem(열쇠);
    else sessionStorage.setItem(열쇠, JSON.stringify(값));
  } catch {
    // 저장소가 막혀 있어도 시험은 돈다
  }
}

// 시작 요청이 도는 중에 새 시나리오가 저장되면 화면이 새 번호 것으로 바뀌어 옛 인스턴스는 새 번호를 모른다.
// 늦게 온 시작 응답이 옛 new 열쇠에 적히지 않게 어디로 옮겼는지 기억한다
const 옮긴곳 = new Map<string, string>();

/** 새 시나리오를 저장해 주소가 바뀌어도 도는 시험을 이어 가려고 new 열쇠의 값을 새 번호 열쇠로 옮긴다 */
export function 시험열쇠옮기기(옛: string, 새: string) {
  옮긴곳.set(옛, 새);
  const 값 = 읽기(옛);
  if (값 === null) return;
  쓰기(새, 값);
  쓰기(옛, null);
}

// 줄 하나가 effect 한 번의 묻기 줄이다. StrictMode 가 effect 를 두 번 돌려도 지난 줄의 늦은 응답은 이 표시로 끊긴다
interface 줄 {
  끝남: boolean;
}

export function useScenarioTrial(열쇠: string) {
  const t = use말();
  const 언어 = use언어();
  const [상태, set상태] = useState(비어있다);
  const 타이머 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const 지금줄 = useRef<줄>({ 끝남: false });
  // 주소가 바뀌어 화면이 그대로 남아도 지울 때는 지금 열쇠를 써야 한다
  const 열쇠쪽 = useRef(열쇠);
  열쇠쪽.current = 열쇠;
  const 글 = useRef(t);
  글.current = t;
  const 말투 = useRef(언어);
  말투.current = 언어;
  const 지금번호 = useRef<string | null>(null);
  지금번호.current = 상태.trialId;
  const 멈춰달라 = useRef(false);

  const 묻기 = useCallback(async (trialId: string, 이줄: 줄) => {
    try {
      const 답 = await scenarioApi.trial(trialId);
      if (이줄.끝남) return;
      if (답.status === 'RUNNING') {
        const vision = 답.vision?.url ?? null;
        const 폰이름 = 답.vision?.name ?? null;
        set상태((앞) => {
          const 쌓임 = 단계쌓기(앞.지금단계들, 답.step === undefined ? undefined : { ...답.step, title: '' });
          return 앞.vision === vision && 앞.폰이름 === 폰이름 && 쌓임 === 앞.지금단계들 && 앞.오류문장 === null
            ? 앞
            : { ...앞, vision, 폰이름, 지금단계들: 쌓임, 오류문장: null };
        });
        타이머.current = setTimeout(() => void 묻기(trialId, 이줄), 묻는간격);
        return;
      }
      // 끝난 시험은 화면 상태에만 둔다. 열쇠를 남기면 서버가 잊은 뒤 그 시나리오를 열 때 엉뚱한 「찾지 못했습니다」가 뜬다
      쓰기(옮긴곳.get(열쇠쪽.current) ?? 열쇠쪽.current, null);
      set상태((앞) => ({ ...앞, 단계: 'done', 결과: 답.result, vision: null, 폰이름: null, 중단함: false }));
    } catch (err) {
      if (이줄.끝남) return;
      const 없다 = err instanceof ApiError && err.code === 'TRIAL_NOT_FOUND';
      // 한 번 묻기가 끊긴 것(망 · 5xx)으로 창을 내리지 않는다 — 시험은 서버에서 계속 돌고 창이 내려가면 「중단」할 길이 없다. 다음 간격에 다시 묻는다
      if (!없다) {
        set상태((앞) => ({ ...앞, 오류문장: message(err, 말투.current) }));
        타이머.current = setTimeout(() => void 묻기(trialId, 이줄), 묻는간격);
        return;
      }
      쓰기(옮긴곳.get(열쇠쪽.current) ?? 열쇠쪽.current, null);
      set상태((앞) => ({
        ...앞,
        단계: 'failed',
        vision: null,
        폰이름: null,
        중단함: false,
        오류문장: 글.current('시험 결과를 찾지 못했습니다. 시간이 지났거나 서버가 다시 켜졌을 수 있습니다'),
      }));
    }
  }, []);

  useEffect(() => {
    const 이줄: 줄 = { 끝남: false };
    지금줄.current = 이줄;
    if (열쇠쪽.current === 시험열쇠(null)) {
      // 새 시나리오 화면의 열쇠는 저장 안 한 옛 초안의 시험이라 뜻이 없다. 새로고침하면 초안도 사라진다
      옮긴곳.delete(열쇠쪽.current);
      쓰기(열쇠쪽.current, null);
    } else {
      const 저장 = 읽기(열쇠쪽.current);
      if (저장 !== null) {
        set상태({ ...비어있다, 단계: 'running', trialId: 저장.trialId, env: 저장.env, 단계들: 저장.parts ?? null, 시작시각: 저장.시작 ?? Date.now() });
        void 묻기(저장.trialId, 이줄);
      }
    }
    return () => {
      이줄.끝남 = true;
      clearTimeout(타이머.current);
    };
  }, [묻기]);

  const 시작 = useCallback(
    async (본문: 시험본문) => {
      const 이줄 = 지금줄.current;
      clearTimeout(타이머.current);
      const 시작 = Date.now();
      멈춰달라.current = false;
      set상태({ ...비어있다, 단계: 'running', env: 본문.env, 단계들: 본문.parts, 시작시각: 시작 });
      try {
        const { trialId } = await scenarioApi.startTrial(본문);
        // 화면을 떠났거나 열쇠가 옮겨진 뒤에 와도 지금 열쇠에는 적어 둔다
        쓰기(옮긴곳.get(열쇠쪽.current) ?? 열쇠쪽.current, { trialId, env: 본문.env, parts: 본문.parts, 시작 });
        if (이줄.끝남) return;
        // 다시 그리기 전에 누른 「중단」도 번호를 읽게 바로 적는다 — 그리기에서만 채우면 그 틈의 중단이 빈손으로 끝난다
        지금번호.current = trialId;
        set상태((앞) => ({ ...앞, trialId }));
        // 시작 응답이 오기 전에 중단을 눌렀다면 번호를 안 뒤에 멈춘다
        if (멈춰달라.current) void scenarioApi.abortTrial(trialId).catch(() => undefined);
        타이머.current = setTimeout(() => void 묻기(trialId, 이줄), 묻는간격);
      } catch (err) {
        if (이줄.끝남) return;
        const 바쁨 = err instanceof ApiError && err.code === 'TRIAL_BUSY';
        set상태({
          ...비어있다,
          단계: 'failed',
          오류문장: 바쁨
            ? 글.current('이미 시험 실행이 돌고 있습니다. 끝나면 다시 실행할 수 있습니다')
            : message(err, 말투.current),
        });
      }
    },
    [묻기],
  );

  /** 사람이 시험을 멈춘다. 결과는 계속 묻다가 러너가 돌려준 것을 받는다 */
  const 중단 = useCallback(async () => {
    멈춰달라.current = true;
    set상태((앞) => ({ ...앞, 중단함: true }));
    const 번호 = 지금번호.current;
    if (번호 === null) return;
    try {
      await scenarioApi.abortTrial(번호);
    } catch (err) {
      set상태((앞) => ({ ...앞, 중단함: false, 오류문장: message(err, 말투.current) }));
    }
  }, []);

  return { ...상태, 시작, 중단 };
}
