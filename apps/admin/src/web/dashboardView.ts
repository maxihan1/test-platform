// 대시보드 화면이 쓰는 셈 — 통과율 · 증감 · 도넛 조각 · 시각 글자 · 숫자 올라가기. 화면 글자는 여기서 안 만든다(Dashboard 가 t() 로 만든다)

import { useEffect, useRef, useState } from 'react';

import type { 건수 } from '../reporting/dashboardResults.js';

import type { 언어 } from './i18n.js';

const 합 = (c: 건수): number => c.pass + c.fail + c.notRun;

/**
 * 통과 / (통과 + 실패 + 미실행) 의 정수 퍼센트. 미실행도 분모다 — 빼면 러너가 고장 난 날이 좋아 보인다 (도메인/리포팅 §8.12).
 * 분모가 0 이면 null 이다. 0 으로 내면 「다 실패했다」로 읽힌다
 */
export function 통과율(c: 건수): number | null {
  return 몫퍼센트(c.pass, 합(c));
}

export function 몫퍼센트(수: number, 전체: number): number | null {
  return 전체 === 0 ? null : Math.round((수 / 전체) * 100);
}

export interface 증감값 {
  방향: 'up' | 'down' | 'same';
  값: number;
}

/** 화면에 보이는 두 정수의 차이(%p). 어느 쪽이든 비었으면 견줄 것이 없어 null — 보이는 숫자끼리 빼야 눈으로 검산이 된다 */
export function 증감(현재: 건수, 직전: 건수): 증감값 | null {
  const 이번 = 통과율(현재);
  const 앞 = 통과율(직전);
  if (이번 === null || 앞 === null) return null;
  const 차 = 이번 - 앞;
  return { 방향: 차 > 0 ? 'up' : 차 < 0 ? 'down' : 'same', 값: Math.abs(차) };
}

export interface 조각 {
  종류: 'p' | 'f' | 'n';
  /** 고리 한 바퀴를 100 으로 본 길이 — 원에 `pathLength="100"` 을 걸어 두어 둘레 계산이 필요 없다 */
  길이: number;
  시작: number;
}

export function 도넛조각(c: 건수): 조각[] {
  const 전체 = 합(c);
  if (전체 === 0) return [];
  let 시작 = 0;
  const 결과: 조각[] = [];
  for (const [종류, 수] of [['p', c.pass], ['f', c.fail], ['n', c.notRun]] as const) {
    if (수 === 0) continue;
    const 길이 = (수 / 전체) * 100;
    결과.push({ 종류, 길이, 시작 });
    시작 += 길이;
  }
  return 결과;
}

/** 안쪽 얇은 고리는 직전 14일의 통과 몫이다. 직전이 비면 고리를 그리지 않는다 */
export function 안쪽고리길이(직전: 건수): number | null {
  const 전체 = 합(직전);
  return 전체 === 0 ? null : (직전.pass / 전체) * 100;
}

export function 흐름글자(칸: 'F' | 'P' | 'N'): 'p' | 'f' | 'n' {
  return 칸 === 'P' ? 'p' : 칸 === 'F' ? 'f' : 'n';
}

/** `2026-10-07` → `10/7`. 서버가 이미 사용자 시간대로 자른 날 글자라 Date 를 거치지 않는다 */
export function 날짜글자(day: string): string {
  const [, 월, 일] = day.split('-');
  return `${Number(월)}/${Number(일)}`;
}

/** 표 안의 시각. 연도 없이 월 · 일 · 시 · 분만 — 14일 창이라 연도가 필요 없다 */
export function 짧은시각(iso: string, 언어: 언어): string {
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** 큰 숫자가 올라가는 시간. styles.css 의 `--dur-count` 와 같은 값이다 */
const 올라가는시간 = 400;

const 움직임줄임 = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 큰 숫자가 0 에서 올라간다. **처음 한 번만이다** — 끝난 뒤 값이 바뀌면 곧바로 새 값을 보인다.
 * 「움직임 줄이기」를 켠 사람에게는 처음부터 값이다. 끝났다고 적는 시점은 시작이 아니라 완주다 —
 * 개발 모드의 이중 실행이 첫 번째 타이머를 끄고 나서 두 번째가 곧장 값으로 가는 일을 막는다
 */
export function use올라가기(목표: number): number {
  const 줄임 = useRef(움직임줄임());
  const 끝남 = useRef(줄임.current);
  const [값, set값] = useState(줄임.current ? 목표 : 0);
  useEffect(() => {
    if (끝남.current) {
      set값(목표);
      return undefined;
    }
    const 시작 = Date.now();
    const 타이머 = setInterval(() => {
      const 진행 = Math.min(1, (Date.now() - 시작) / 올라가는시간);
      set값(Math.round(목표 * (1 - (1 - 진행) ** 3)));
      if (진행 === 1) {
        끝남.current = true;
        clearInterval(타이머);
      }
    }, 16);
    return () => clearInterval(타이머);
  }, [목표]);
  return 값;
}
