// 멈춰 가며 하기 — 조작 함수를 부르기 직전에 멈춘 게임을 풀고, 끝난 바로 뒤에 다시 멈춘다 (authoring-game-play 의 돌린다가 쓴다)
import type { Game } from 'control-cli';

import { 멈춤표시읽기, 멈춤표시쓰기, 멈춤표시지우기 } from './authoring-game-freeze.js';

/** 돌린다의 해본다 — 던지면 못한것에 적고 null */
export type 해보기 = <T>(무엇: string, 일: () => Promise<T>) => Promise<T | null>;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export interface 풀림 {
  /** 함수가 도는 배율 — 풀었으면 푼 뒤 값 */
  배율: number | null;
  알림말: string[];
  /** 표시가 있는데 못 풀었다 */
  멈춘채: boolean;
}

/**
 * 부르기 앞 값(배율)을 읽은 뒤 함수를 부르기 직전에 부른다. 표시가 있고 0배면 푼다 — 멈춘 채 부르면 함수가 한도를 넘겨 「짐」으로 굳는다.
 * 표시가 없으면 0배여도 안 푼다 — 게임이 스스로 멈춘 화면을 덮지 않는다
 */
export async function 풀기(게임: Pick<Game, 'setTimeScale'>, 자료: string | undefined, 앞배율: number | null, 해본다: 해보기): Promise<풀림> {
  const r: 풀림 = { 배율: 앞배율, 알림말: [], 멈춘채: false };
  const 표시 = 자료 === undefined ? null : 멈춤표시읽기(자료);
  if (자료 === undefined || 표시 === null) {
    if (앞배율 === 0) r.알림말.push('지금 시간 배율이 0 이다 — 이 명령이 멈춘 것이 아니라 풀지 않았다(일시정지 창이거나 손으로 멈춤). 판이 안 흐른다');
    return r;
  }
  // 게임을 다시 켰거나 손으로 푼 것이다 — 표시만 지운다
  if (앞배율 === 0 && 표시.배율 !== 0) {
    if ((await 해본다('멈춘 게임 풀기', () => 게임.setTimeScale(표시.배율))) === null) {
      r.멈춘채 = true;
      r.알림말.push('멈춰 둔 게임을 못 풀었다 — 판이 안 흐른다');
      return r;
    }
    r.배율 = 표시.배율;
  }
  if (앞배율 !== null) 멈춤표시지우기(자료);
  return r;
}

export interface 멈춤 {
  /** 멈추고 되읽은 값 — 멈추기를 안 했으면(이미 0배 · 자료 폴더 모름) 없다 */
  멈춘뒤배율?: number | null;
  알림말: string[];
}

/**
 * 함수가 끝난 바로 뒤 — 입력을 놓기 전에 멈춘다. 표시를 먼저 쓰고 멈춘다(멈춘 뒤 표시가 안 써지면 아무도 못 푼다).
 * 풀 값은 함수가 배율을 바꿨으면 부르기 앞 값, 아니면 지금 값이다
 */
export async function 멈추기(게임: Pick<Game, 'timeScale' | 'setTimeScale'>, 자료: string | undefined, 풀린배율: number | null, 배율바꿈: boolean, 해본다: 해보기): Promise<멈춤> {
  const 지금 = await 해본다('시간 배율 읽기', () => 게임.timeScale());
  if (지금 === null) return { 멈춘뒤배율: null, 알림말: [] };
  if (지금 === 0) return { 알림말: ['게임이 이미 멈춰 있다(시간 배율 0) — 멈춤 표시를 안 썼으니 다음에 불러도 풀지 않는다'] };
  if (자료 === undefined) return { 멈춘뒤배율: 지금, 알림말: ['자료 폴더를 몰라 멈춤 표시를 못 써서 멈추지 않았다'] };
  try {
    멈춤표시쓰기(자료, 배율바꿈 && 풀린배율 !== null ? 풀린배율 : 지금);
  } catch (e) {
    return { 멈춘뒤배율: 지금, 알림말: [`멈춤 표시를 못 써서 멈추지 않았다(${까닭(e)})`] };
  }
  await 해본다('시간 배율 멈추기', () => 게임.setTimeScale(0));
  const 뒤 = await 해본다('시간 배율 되읽기', () => 게임.timeScale());
  // 못 멈췄으면 표시가 거짓이다 — 남기면 다음에 0배가 아닌 게임에서 헛되이 지워질 뿐이지만 깨끗이 치운다
  if (뒤 !== null && 뒤 !== 0) 멈춤표시지우기(자료);
  return { 멈춘뒤배율: 뒤, 알림말: [] };
}
