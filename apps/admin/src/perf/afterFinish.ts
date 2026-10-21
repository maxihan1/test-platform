// 성능 실행이 끝쓰기에 성공한 뒤 이어 할 일 — AI 분석 일 세우기 (도메인/성능 §7 「실행 · 결과」)
// 여기서 던지면 끝내기가 깨져 실행이 닫힌 뒤인데도 로그만 어긋난다 — 일마다 잡아 남긴다

import { 분석일세우기 } from './analysis.js';
import type { 끝값 } from './store.js';

export async function 끝난뒤(runId: number, 값: 끝값): Promise<void> {
  // 오류로 끝났거나 1초 숫자가 하나도 없으면 분석할 것이 없다
  if (값.status !== 'ERROR' && 값.peakVus !== null) {
    try {
      await 분석일세우기(runId, 'system');
    } catch (e) {
      console.error(`성능 실행 ${runId} 의 AI 분석 일을 세우지 못했습니다`, e);
    }
  }
}
