// 시험 실행 창이 그릴 단계 줄 · 대기열 알약 · 실패 카드의 안 돈 단계 · 걸린 시간 글자를 고르는 순수 함수 (도메인/실행 §8.16 ③ ④)

import type { ItemStatus, TrialResult } from './api.js';
import { t, type 언어 } from './i18n.js';
import { 시간글자 } from './remainText.js';
import type { 디바이스칸, 쌓인단계 } from './useTrialQueue.js';

export interface 도는단계줄 {
  seq: number;
  title: string;
  상태: 'done' | 'now' | 'wait';
  /** 끝난 단계는 걸린 시간, 지금 단계는 경과. 모르면 없다 — 묻는 사이 지나간 단계는 시작도 끝도 못 봤다 */
  ms?: number;
}

/**
 * 도는 시험의 단계 줄. 제목을 알면 처음부터 다 세우고 지금 단계 뒤는 기다림이다.
 * 모르면 받은 단계를 한 줄씩 늘린다 (도메인/실행 §3.2 「단계 목록은 처음부터 다 보인다」)
 */
export function 도는단계줄들(쌓인: 쌓인단계[], 제목들: string[] | null): 도는단계줄[] {
  const 끝 = 쌓인[쌓인.length - 1];
  // 바로 다음 단계를 봤을 때만 잰다. 사이에 빠진 단계가 있으면 그 시간까지 섞인다
  const 걸린 = (seq: number): number | undefined => {
    const i = 쌓인.findIndex((s) => s.seq === seq);
    const 다음 = 쌓인[i + 1];
    return i < 0 || 다음 === undefined || 다음.seq !== seq + 1 ? undefined : Math.max(0, 다음.시작 - 쌓인[i]!.시작);
  };
  const 줄 = (seq: number, title: string): 도는단계줄 => {
    if (끝 !== undefined && seq === 끝.seq) return { seq, title, 상태: 'now', ms: 끝.elapsedMs };
    if (끝 !== undefined && seq < 끝.seq) {
      const ms = 걸린(seq);
      return ms === undefined ? { seq, title, 상태: 'done' } : { seq, title, 상태: 'done', ms };
    }
    return { seq, title, 상태: 'wait' };
  };
  return 제목들 === null ? 쌓인.map((s) => 줄(s.seq, s.title)) : 제목들.map((title, i) => 줄(i + 1, title));
}

export interface 결과단계줄 {
  seq: number;
  title: string;
  /** null 은 실패하거나 사람이 멈춰서 돌지 않은 단계 — 「실행 안 함」 */
  status: ItemStatus | null;
}

/**
 * 끝난 시험의 단계 줄. 결과에 없는 남은 단계는 「실행 안 함」으로 붙인다 (점검표 B6).
 * 결과 단계가 저장된 제목과 하나라도 다르면 남은 단계를 지어내지 않는다
 */
export function 결과단계줄들(결과: TrialResult, 제목들: string[] | null | undefined): 결과단계줄[] {
  const 줄들: 결과단계줄[] = 결과.steps.map((s) => ({ seq: s.seq, title: s.title, status: s.status }));
  if (제목들 === null || 제목들 === undefined || !결과.steps.every((s) => 제목들[s.seq - 1] === s.title)) return 줄들;
  const 끝 = 결과.steps.reduce((큰, s) => Math.max(큰, s.seq), 0);
  return [...줄들, ...제목들.slice(끝).map((title, i) => ({ seq: 끝 + i + 1, title, status: null }))];
}

export type 알약종류 = 'run' | 'pass' | 'fail' | 'wait' | 'na';

/**
 * 대기열 줄의 상태 알약 하나 — 디바이스 칸을 셈으로 묶는다(`통과 2` · `실패 1` · `진행 중` · `대기 2`).
 * 앞 판은 `PC 통과 2.79초 · 모바일 통과 3.85초` 가 한 줄에 빽빽했다 (점검표 D3)
 */
export function 대기열알약(칸들: 디바이스칸[]): { 종류: 알약종류; 수: number } {
  const 수 = (조건: (칸: 디바이스칸) => boolean) => 칸들.filter(조건).length;
  if (칸들.some((칸) => 칸.줄.종류 === 'run')) return { 종류: 'run', 수: 1 };
  const 실패 = 수((칸) => 칸.줄.종류 === 'done' && 칸.줄.결과.status === 'FAIL');
  if (실패 > 0) return { 종류: 'fail', 수: 실패 };
  const 대기 = 수((칸) => 칸.줄.종류 === 'wait');
  if (대기 > 0) return { 종류: 'wait', 수: 대기 };
  const 통과 = 수((칸) => 칸.줄.종류 === 'done' && 칸.줄.결과.status === 'PASS');
  return 통과 === 칸들.length ? { 종류: 'pass', 수: 통과 } : { 종류: 'na', 수: 칸들.length - 통과 };
}

/** 걸린 시간은 초 단위다 — `3초` · `1분 2초` (점검표 B15f). 반올림해 0 이면 0초가 아니라 「1초 미만」이다 */
export function 걸린글(ms: number, 언어: 언어): string {
  return ms < 500 ? t('1초 미만', 언어) : 시간글자(ms, 언어);
}

/** 지금 단계는 몇째 초인지 적는다 — 0.3초 지났으면 `1초째`, 62.5초면 `1분 3초째` */
export const 째글 = (ms: number, 언어: 언어): string => t('{시간}째', 언어, { 시간: 시간글자((Math.floor(ms / 1000) + 1) * 1000, 언어) });
