// E2E 시나리오 시험 실행의 상태 — 시작 · 2초마다 묻기 · sessionStorage 에 시험 번호 두기 · 화면을 다시 열면 이어 묻기

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi } from './scenarioApi.js';
import { message } from './ui.js';

export interface 시험상태 {
  단계: 'idle' | 'running' | 'done' | 'failed';
  trialId: string | null;
  env: string;
  결과: ScenarioExecuteResponse | null;
  오류문장: string | null;
}

export interface 시험본문 {
  service: string;
  env: string;
  platform: Platform;
  parts: ScenarioPart[];
}

const 묻는간격 = 2000;
const 비어있다: 시험상태 = { 단계: 'idle', trialId: null, env: '', 결과: null, 오류문장: null };

export const 시험열쇠 = (id: number | null) => 'scn-trial:' + String(id ?? 'new');

// 저장소가 막힌 브라우저에서도 화면이 돌아야 해서 읽기 · 쓰기를 전부 감싼다. 잃는 것은 이어 묻기뿐이다
function 읽기(열쇠: string): { trialId: string; env: string } | null {
  try {
    const 글 = sessionStorage.getItem(열쇠);
    if (글 === null) return null;
    const 값: unknown = JSON.parse(글);
    if (typeof 값 !== 'object' || 값 === null) return null;
    const { trialId, env } = 값 as Record<string, unknown>;
    return typeof trialId === 'string' && typeof env === 'string' ? { trialId, env } : null;
  } catch {
    return null;
  }
}

function 쓰기(열쇠: string, 값: { trialId: string; env: string } | null) {
  try {
    if (값 === null) sessionStorage.removeItem(열쇠);
    else sessionStorage.setItem(열쇠, JSON.stringify(값));
  } catch {
    // 저장소가 막혀 있어도 시험은 돈다
  }
}

/** 새 시나리오를 저장해 주소가 바뀌어도 도는 시험을 이어 가려고 new 열쇠의 값을 새 번호 열쇠로 옮긴다 */
export function 시험열쇠옮기기(옛: string, 새: string) {
  const 값 = 읽기(옛);
  if (값 === null) return;
  쓰기(새, 값);
  쓰기(옛, null);
}

export function useScenarioTrial(열쇠: string) {
  const t = use말();
  const 언어 = use언어();
  const [상태, set상태] = useState(비어있다);
  const 타이머 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const 산다 = useRef(true);
  // 주소가 바뀌어 화면이 그대로 남아도 지울 때는 지금 열쇠를 써야 한다
  const 열쇠쪽 = useRef(열쇠);
  열쇠쪽.current = 열쇠;
  const 글 = useRef(t);
  글.current = t;
  const 말투 = useRef(언어);
  말투.current = 언어;

  const 묻기 = useCallback(async (trialId: string) => {
    try {
      const 답 = await scenarioApi.trial(trialId);
      if (!산다.current) return;
      if (답.status === 'RUNNING') {
        타이머.current = setTimeout(() => void 묻기(trialId), 묻는간격);
        return;
      }
      set상태((앞) => ({ ...앞, 단계: 'done', 결과: 답.result }));
    } catch (err) {
      if (!산다.current) return;
      const 없다 = err instanceof ApiError && err.code === 'TRIAL_NOT_FOUND';
      if (없다) 쓰기(열쇠쪽.current, null);
      set상태((앞) => ({
        ...앞,
        단계: 'failed',
        오류문장: 없다
          ? 글.current('시험 결과를 찾지 못했습니다. 시간이 지났거나 서버가 다시 켜졌을 수 있습니다')
          : message(err, 말투.current),
      }));
    }
  }, []);

  useEffect(() => {
    산다.current = true;
    const 저장 = 읽기(열쇠쪽.current);
    if (저장 !== null) {
      set상태({ ...비어있다, 단계: 'running', trialId: 저장.trialId, env: 저장.env });
      void 묻기(저장.trialId);
    }
    return () => {
      산다.current = false;
      clearTimeout(타이머.current);
    };
  }, [묻기]);

  const 시작 = useCallback(
    async (본문: 시험본문) => {
      clearTimeout(타이머.current);
      set상태({ ...비어있다, 단계: 'running', env: 본문.env });
      try {
        const { trialId } = await scenarioApi.startTrial(본문);
        if (!산다.current) return;
        쓰기(열쇠쪽.current, { trialId, env: 본문.env });
        set상태((앞) => ({ ...앞, trialId }));
        타이머.current = setTimeout(() => void 묻기(trialId), 묻는간격);
      } catch (err) {
        if (!산다.current) return;
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

  return { ...상태, 시작 };
}
