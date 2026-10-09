// 여러 케이스를 「테스트 실행」으로 한 건씩 차례로 돌리는 큐 — 기록에 남지 않는다 (도메인/실행 §3.2 · §7)
//
// 서버는 사람당 한 건만 받는다(TRIAL_BUSY). 그래서 병렬이 아니라 차례로 돌리고, 한 건이 끝나야 다음을 시작한다.
// 새 서버 API 는 없다 — 케이스 테스트 실행 통로 둘(시작 · 결과)을 케이스마다 되풀이한다

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type RunRequestItem, type TrialResult } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

export type 시험줄 =
  | { 종류: 'wait' }
  | { 종류: 'run' }
  | { 종류: 'done'; 결과: TrialResult }
  | { 종류: 'notice'; 글: string };

const 기본간격 = 1500;

/** @param 간격 결과를 다시 묻는 주기(ms). 검사에서만 줄인다 */
export function useTrialQueue(간격: number = 기본간격) {
  const t = use말();
  const 언어 = use언어();
  const [줄들, set줄들] = useState<Record<string, 시험줄>>({});
  const [도는중, set도는중] = useState(false);
  // 화면을 떠나면 남은 줄을 시작하지 않는다. 안 멈추면 없는 화면에 상태를 쓰며 서버를 계속 두드린다
  const 멈춤 = useRef(false);
  const 도는 = useRef(false);

  useEffect(() => {
    멈춤.current = false;
    return () => {
      멈춤.current = true;
    };
  }, []);

  const 쓴다 = (tcId: string, 줄: 시험줄) => {
    if (!멈춤.current) set줄들((전) => ({ ...전, [tcId]: 줄 }));
  };

  /** 이어 돌면 null, 멈추면 남은 줄에 붙일 글 */
  async function 한건(항목: RunRequestItem, 열주소: string): Promise<string | null> {
    쓴다(항목.tcId, { 종류: 'run' });
    try {
      // 디바이스는 첫째 하나만 돈다 — 한 건 창은 사람이 고른 것 중 첫째다 (도메인/실행 §8.2)
      const { trialId } = await api.startTrial(항목.tcId, {
        platform: 항목.platforms[0]!,
        baseUrl: 열주소,
        params: 항목.params,
        expected: 항목.expected,
      });
      for (;;) {
        const 답 = await api.getTrial(항목.tcId, trialId);
        if (멈춤.current) return '';
        if (답.status === 'DONE') {
          쓴다(항목.tcId, { 종류: 'done', 결과: 답.result });
          return null;
        }
        await new Promise((ok) => setTimeout(ok, 간격));
        if (멈춤.current) return '';
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TRIAL_OFF') {
        const 글 = t('이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 SETUP');
        쓴다(항목.tcId, { 종류: 'notice', 글 });
        return 글;
      }
      if (err instanceof ApiError && err.code === 'TRIAL_BUSY') {
        const 글 = t('이미 테스트 실행이 돌고 있습니다');
        쓴다(항목.tcId, { 종류: 'notice', 글 });
        return 글;
      }
      if (err instanceof ApiError && err.code === 'DEVICE_BUSY') {
        // 디바이스 하나가 바쁜 것이라 그 줄만 안내하고 다음 줄은 이어 돈다
        쓴다(항목.tcId, { 종류: 'notice', 글: message(err, 언어) });
        return null;
      }
      if (err instanceof ApiError && err.violations.length > 0) {
        // 그 케이스만 안 맞는다. 다음 줄은 이어 돈다
        쓴다(항목.tcId, { 종류: 'notice', 글: t('입력값이 명세와 맞지 않습니다.') });
        return null;
      }
      쓴다(항목.tcId, { 종류: 'notice', 글: message(err, 언어) });
      return t('앞 케이스에서 멈춰 돌리지 못했습니다');
    }
  }

  async function 시작(항목들: RunRequestItem[], 열주소: string): Promise<void> {
    // 두 번 눌러도 큐가 둘 생기지 않게 막는다
    if (도는.current) return;
    도는.current = true;
    set도는중(true);
    set줄들(Object.fromEntries(항목들.map((it) => [it.tcId, { 종류: 'wait' } as 시험줄])));
    try {
      for (let i = 0; i < 항목들.length; i += 1) {
        if (멈춤.current) return;
        const 멈춘글 = await 한건(항목들[i]!, 열주소);
        if (멈춘글 === null) continue;
        // 서버 전체에 걸린 사정이나 러너 고장이면 남은 줄도 돌릴 수 없다. 대기로 두면 영영 기다리는 것처럼 보인다
        for (const 남은 of 항목들.slice(i + 1)) 쓴다(남은.tcId, { 종류: 'notice', 글: 멈춘글 });
        break;
      }
    } finally {
      도는.current = false;
      if (!멈춤.current) set도는중(false);
    }
  }

  return { 줄들, 도는중, 시작 };
}
