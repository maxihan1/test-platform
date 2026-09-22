// 화면 글자를 한국어와 영어로 낸다 (SPEC §8 「다국어」)
// 키가 한국어 원문이라 표는 영어 한 벌뿐이다 — 표에 없으면 키가 그대로 나가 화면이 깨지지 않는다

import { createContext, useContext } from 'react';

import { 말 } from './messages.js';

export type 언어 = 'ko' | 'en';
export const 기본언어: 언어 = 'ko';

/** 같은 한국어를 자리마다 다르게 번역하려고 키 뒤에 붙이는 꼬리. 화면에는 나오지 않는다 */
const 꼬리 = / \([^)]*\)$/u;

/** 자리표에 끼울 값. `t('모두 {건수}건', { 건수: 42 })` */
export type 값들 = Record<string, string | number>;

function 채운다(글: string, 값: 값들): string {
  // 값을 안 준 자리표는 그대로 둔다. 빈 칸으로 만들면 무엇이 빠졌는지 화면에서 안 보인다
  return 글.replace(/\{([^}]+)\}/gu, (원, 이름: string) => (이름 in 값 ? String(값[이름]) : 원));
}

/**
 * 번역 규칙 그 자체. **표를 인자로 받는다.**
 *
 * 실제 표와 떼어 둔 이유는 하나다 — 규칙을 재는 검사가 표가 자랄 때마다 흔들리면 안 된다.
 * 화면은 이것을 직접 부르지 않고 아래 `t()` 나 `use말()` 을 쓴다.
 */
export function 글자(키: string, 언어: 언어, 표: Record<string, string>, 값?: 값들): string {
  const 번역: string | undefined = 언어 === 'en' ? 표[키] : undefined;
  const 글 = 번역 ?? 키.replace(꼬리, '');
  return 값 === undefined ? 글 : 채운다(글, 값);
}

/** 화면 바깥(훅을 못 쓰는 자리)에서 쓴다. 언어를 직접 넘긴다 */
export function t(키: string, 언어: 언어, 값?: 값들): string {
  return 글자(키, 언어, 말, 값);
}

const 언어칸 = createContext<언어>(기본언어);
export const 언어함 = 언어칸.Provider;

/**
 * 화면이 쓰는 훅. 지금 언어를 물고 있는 `t` 를 돌려준다.
 *
 * **키는 언제나 정적 문자열이어야 한다.** 값이 박힌 글자는 자리표로 넣는다 —
 * 템플릿 문자열로 쓰면 `messages.test.ts` 의 소스 훑기가 빨간불을 낸다.
 */
export function use말(): (키: string, 값?: 값들) => string {
  const 지금 = useContext(언어칸);
  return (키, 값) => 글자(키, 지금, 말, 값);
}

/**
 * 지금 언어만 필요할 때. **훅을 못 쓰는 순수 모듈에 넘기려고 쓴다.**
 *
 * `runState.ts` 처럼 컴포넌트가 아닌 자리는 훅을 못 부르므로 언어를 인자로 받는다.
 * 그 값을 화면이 여기서 꺼내 넘긴다.
 */
export function use언어(): 언어 {
  return useContext(언어칸);
}
