// 판 도중 처음 나온 종류를 펼쳐 값 파일로 남기는 한 걸음 — authoring-game-play-spawns 가 300줄을 넘어 떼어 냈다 (도메인/게임 §3.10 「조작 도우미」 「새로 나온 것」)
import type { Found, Game } from 'control-cli';

import { 값파일있나 } from './authoring-game-bundles.js';
import { 펼쳐남기기 } from './authoring-game-props.js';
import type { 나온것 } from './authoring-game-play-spawns.js';
import { 이름만 } from './authoring-game-watch-report.js';

/**
 * 한 판에 펼치는 종류. 한 종류가 명령 수십 개(컴포넌트 · 칸 · 묶음 칸)라 판 도중 많이 펼치면 조작 함수의 입력이 밀릴 수 있다 —
 * 10 에서 40 으로 넓혔고 이미 값 파일이 있는 종류는 다시 안 펼치니 판을 거듭하면 처음 나온 종류가 다 채워진다.
 * 명령은 한 줄로 서므로 함수의 입력은 명령 하나 뒤로 밀리는 데 그친다는 짐작이다(실측에서 확인 — 밀리면 상한을 내린다)
 */
export const 펼칠상한 = 40;

/**
 * 처음 보인 종류 하나를 펼친다 — 이미 값 파일이 있으면 건너뛰고, 상한을 넘으면 「안 펼침」으로 남긴다.
 * 그침(판이 끝나 세기를 그쳤다)은 판 뒤에 명령을 더 보내지 않게 그대로 다시 던진다
 */
export async function 새종류펼치기(o: { 나온: 나온것; 종류: string; 찾음: Found; 초: number; 펼칠까: boolean; 게임: Game; 장면: string | null; 자료?: string; 덧?: { 치트: true; call: string[] }; 그침인가: (e: unknown) => boolean }): Promise<void> {
  const { 나온, 종류, 찾음, 초 } = o;
  if (o.자료 !== undefined && 값파일있나(o.자료, 종류)) {
    (나온.이미펼침 ??= []).push(종류);
    return;
  }
  if (!o.펼칠까 || 나온.펼침.length >= 펼칠상한) {
    나온.안펼침.push(종류);
    return;
  }
  const 주소 = 찾음.id === undefined ? 찾음.path : `//*[@id=${찾음.id}]`;
  try {
    const 글 = await 펼쳐남기기(o.게임, 주소, 이름만(찾음.path), { 종류, 장면: o.장면, ...(o.자료 === undefined ? {} : { 자료: o.자료 }), ...(o.덧 === undefined ? {} : { 덧: o.덧 }) });
    나온.펼침.push({ 종류, 초, 주소, 글 });
  } catch (e) {
    if (o.그침인가(e)) {
      나온.안펼침.push(종류);
      throw e;
    }
    나온.펼침.push({ 종류, 초, 주소, 못함: e instanceof Error ? e.message : String(e) });
  }
}
