// 성능 AI 일(초안 · 추천)을 맡기고 끝날 때까지 묻는 훅. 일은 작성 에이전트가 집어 몇 분 안에 끝낸다 (도메인/성능 §7 「AI 일」)

import { useEffect, useRef, useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { perfApi } from './perfApi.js';
import { message } from './ui.js';

/** 묻는 간격. 검사가 기다리지 않게 바꿀 수 있게 내보낸다 */
export const 묻는간격 = { ms: 3000 };

export function usePerfJob<T>(끝: (결과: T, jobId: number) => void): { 도나: boolean; 오류: string | null; 맡기기: (요청: () => Promise<{ jobId: number }>) => Promise<void> } {
  const t = use말();
  const 언어 = use언어();
  const [도나, set도나] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 화면을 떠난 뒤에는 묻기를 멈춘다 — 안 멈추면 닫힌 화면의 상태를 고치려 든다
  const 살았나 = useRef(true);
  useEffect(() => () => {
    살았나.current = false;
  }, []);

  async function 맡기기(요청: () => Promise<{ jobId: number }>) {
    set도나(true);
    set오류(null);
    try {
      const { jobId } = await 요청();
      for (;;) {
        const 일 = await perfApi.job<T>(jobId);
        if (!살았나.current) return;
        if (일.status === 'DONE' && 일.output !== undefined) {
          set도나(false);
          끝(일.output, jobId);
          return;
        }
        if (일.status === 'FAILED') {
          set도나(false);
          set오류(t('AI 가 만들지 못했습니다. {까닭}', { 까닭: 일.error ?? '' }));
          return;
        }
        await new Promise((풀기) => setTimeout(풀기, 묻는간격.ms));
      }
    } catch (err) {
      if (!살았나.current) return;
      set도나(false);
      set오류(message(err, 언어));
    }
  }

  return { 도나, 오류, 맡기기 };
}
