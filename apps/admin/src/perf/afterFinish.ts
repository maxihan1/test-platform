// 성능 실행이 끝쓰기에 성공한 뒤 이어 할 일 — AI 분석 일 세우기 · Slack 알림 (도메인/성능 §7 「실행 · 결과」)
// 끝내기가 실행을 닫고 나서 기다리지 않고 돌린다 — 던지면 처리 안 된 거부가 admin 을 죽이므로 일마다 잡아 남긴다

import type { SecRow } from './judge.js';
import { 분석일세우기 } from './analysis.js';
import { 성능알림 } from './notify.js';
import type { 끝값 } from './store.js';

// 전체줄은 끝내기가 이미 읽은 전체 줄이다 — 분석 재료가 다시 읽지 않게 넘긴다
export async function 끝난뒤(runId: number, 값: 끝값, 전체줄?: SecRow[], 페이지 = false): Promise<void> {
  // 오류로 끝났거나 1초 숫자가 하나도 없으면 분석할 것이 없다. 페이지 측정은 끝까지 재서 줄이 있을 때만이다
  if (페이지 ? 값.status === 'DONE' : 값.status !== 'ERROR' && 값.peakVus !== null) {
    try {
      await 분석일세우기(runId, 'system', 전체줄);
    } catch (e) {
      console.error(`성능 실행 ${runId} 의 AI 분석 일을 세우지 못했습니다`, e);
    }
  }
  try {
    await 성능알림(runId);
  } catch (e) {
    console.error(`성능 실행 ${runId} 의 Slack 알림을 만들지 못했습니다`, e);
  }
}
