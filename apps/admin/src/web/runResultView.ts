// 실행 결과의 거르개 · 쪽 · 펼친 카드를 주소 조건과 오가게 한다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · ⑱ WEB-F8-03)
// 결과는 항목 상세에 갔다 돌아오는 일이 잦아, 돌아올 때마다 1쪽 · 접힌 카드로 풀리면 보던 자리를 다시 찾아야 했다

import { useState, type Dispatch, type SetStateAction } from 'react';

import type { ItemStatus, Platform, 실패유형 } from './api.js';
import type { 변화칸 } from './RunSummary.js';
import { 디바이스순서 } from './ui.js';

export interface 결과보기 {
  판정: ItemStatus | 'ALL';
  device: Platform | 'ALL';
  변화: 변화칸 | null;
  /** 통과 · 미실행 줄의 쪽. 도는 동안에는 줄 전체의 쪽이다 */
  쪽: number;
  카드쪽: number;
  유형: 실패유형 | null;
  안본것만: boolean;
  /** 「자동 수정 N」 — Issue Bunker 테스트 수정으로 통과한 카드만. 서버가 거른다(?autoFix=1) */
  자동수정만: boolean;
  /** 펼친 카드의 케이스 번호. 편 차례다 — 돌아오면 마지막에 편 카드로 화면을 옮긴다 */
  열린: string[];
}

export const 처음보기: 결과보기 = { 판정: 'ALL', device: 'ALL', 변화: null, 쪽: 1, 카드쪽: 1, 유형: null, 안본것만: false, 자동수정만: false, 열린: [] };

/** 이 화면이 주소에 쓰는 칸. 실행 기록은 고른 실행(`run`)에 딸린 칸으로 넘긴다 */
export const 결과칸들 = ['status', 'device', 'change', 'rowpage', 'cardpage', 'cause', 'unjudged', 'autofix', 'open'] as const;

const 판정들: readonly ItemStatus[] = ['PASS', 'FAIL', 'NA'];
const 유형들: readonly 실패유형[] = ['mismatch', 'notFound', 'timeout', 'environment', 'other'];
const 변화글: Record<변화칸, string> = { 새로깨짐: 'new', 계속깨짐: 'kept' };

const 고른것 = <T extends string>(글: string | null, 값들: readonly T[]): T | undefined => 값들.find((값) => 값 === 글);
const 쪽번호 = (글: string | null) => (글 !== null && /^[1-9]\d{0,4}$/.test(글) ? Number(글) : 1);

/**
 * 주소 조건을 읽는다. 모르는 값은 기본값으로 본다 — 손으로 고친 주소가 화면을 깨면 안 된다.
 * `tc` 는 다른 화면의 고리가 「이 카드를 펴서 열라」고 보내는 칸이다(route.ts `실행기록주소`) — 펼친 카드로 받는다
 */
export function 보기읽기(조건: URLSearchParams): 결과보기 {
  const 열린 = (조건.get('open') ?? '').split(',').filter((tc) => tc !== '');
  const tc = 조건.get('tc');
  return {
    판정: 고른것(조건.get('status'), 판정들) ?? 'ALL',
    device: 고른것(조건.get('device'), 디바이스순서) ?? 'ALL',
    변화: (Object.keys(변화글) as 변화칸[]).find((칸) => 변화글[칸] === 조건.get('change')) ?? null,
    쪽: 쪽번호(조건.get('rowpage')),
    카드쪽: 쪽번호(조건.get('cardpage')),
    유형: 고른것(조건.get('cause'), 유형들) ?? null,
    안본것만: 조건.get('unjudged') === '1',
    자동수정만: 조건.get('autofix') === '1',
    열린: tc === null || tc === '' || 열린.includes(tc) ? 열린 : [...열린, tc],
  };
}

/** 주소에 쓸 조건. 기본값은 적지 않는다 */
export function 보기조건(보기: 결과보기): Record<string, string> {
  return {
    ...(보기.판정 === 'ALL' ? {} : { status: 보기.판정 }),
    ...(보기.device === 'ALL' ? {} : { device: 보기.device }),
    ...(보기.변화 === null ? {} : { change: 변화글[보기.변화] }),
    ...(보기.쪽 === 1 ? {} : { rowpage: String(보기.쪽) }),
    ...(보기.카드쪽 === 1 ? {} : { cardpage: String(보기.카드쪽) }),
    ...(보기.유형 === null ? {} : { cause: 보기.유형 }),
    ...(보기.안본것만 ? { unjudged: '1' } : {}),
    ...(보기.자동수정만 ? { autofix: '1' } : {}),
    ...(보기.열린.length === 0 ? {} : { open: 보기.열린.join(',') }),
  };
}

/** 바꿀 칸. 앞 값으로 정하는 꼴은 카드를 펴고 접는 일처럼 잇따라 올 수 있는 것에 쓴다 */
export type 보기바꿈 = Partial<결과보기> | ((앞: 결과보기) => Partial<결과보기>);
export const 바꾼보기 = (앞: 결과보기, 바꿀: 보기바꿈): 결과보기 => ({ ...앞, ...(typeof 바꿀 === 'function' ? 바꿀(앞) : 바꿀) });

/** 판정 칩을 고르면 줄은 1쪽부터 — 앞 쪽 번호로 새 거르개를 보면 빈 쪽이 선다 */
export const 판정고른보기 = (판정: ItemStatus | 'ALL'): Partial<결과보기> => ({ 판정, 쪽: 1 });

/** 디바이스를 고르면 카드도 다른 카드가 서니 카드 쪽 · 칩 · 펼침까지 처음으로 */
export const 디바이스고른보기 = (device: Platform | 'ALL'): Partial<결과보기> => ({ device, 쪽: 1, 카드쪽: 1, 유형: null, 안본것만: false, 자동수정만: false, 열린: [] });

/**
 * 실행 기록 결과 칸의 보기. 그 보기가 어느 실행 것인지 같이 든다 — 보이는 실행이 바뀌면(다른 줄을 고름 · 거르개 · 쪽으로 맨 위 줄이 바뀜 ·
 * 애플리케이션을 바꿈) 처음 보기다. 앞 실행의 「회귀 실패」 · 카드 쪽이 남으면 직전 실행이 없는 실행에서 카드가 다 사라진 채 굳는다.
 * 주소에 실행이 없으면 처음 보이는 맨 위 줄의 보기로 받는다
 */
export function use실행보기(처음: URLSearchParams, 보는실행: number | null): [결과보기, Dispatch<SetStateAction<결과보기>>] {
  const [칸, set칸] = useState(() => ({ 주인: 실행번호(처음.get('run')), 보기: 보기읽기(처음) }));
  if (칸.주인 === null && 보는실행 !== null) set칸({ ...칸, 주인: 보는실행 });
  const 보기 = 칸.주인 === null || 칸.주인 === 보는실행 ? 칸.보기 : 처음보기;
  const set보기: Dispatch<SetStateAction<결과보기>> = (바꿀) =>
    set칸((앞) => {
      const 지금 = 앞.주인 === null || 앞.주인 === 보는실행 ? 앞.보기 : 처음보기;
      return { 주인: 보는실행, 보기: typeof 바꿀 === 'function' ? 바꿀(지금) : 바꿀 };
    });
  return [보기, set보기];
}

const 실행번호 = (글: string | null) => (글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null);

/** 카드를 펴거나 접은 뒤의 보기. 같은 것을 다시 펴면 그대로다 — 펼 때마다 주소가 바뀌지 않게 */
export function 펼침바꾼보기(앞: 결과보기, tcId: string, 열림: boolean): 결과보기 {
  const 있나 = 앞.열린.includes(tcId);
  if (열림 === 있나) return 앞;
  return { ...앞, 열린: 열림 ? [...앞.열린, tcId] : 앞.열린.filter((tc) => tc !== tcId) };
}
