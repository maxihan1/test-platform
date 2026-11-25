// 조작 도우미 기록 남기기 — 부를 때마다 값 · 로그 · 오류 · 화면 한 벌을 자료 폴더에 쓰고 출력용 줄로 줄인다 (authoring-game-play · -watch · -wins 가 같이 쓴다)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import type { 조작결과 } from './authoring-game-play.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 폴더인가 } from './authoring-screens-keep-io.js';

/** 자료 폴더 안 기록 자리 — 부를 때마다 값 · 로그 · 오류 · 화면 한 벌 */
export const 조작기록자리 = 게임자리.조작기록;
const 찍을줄 = 20;
const 줄길이 = 200;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** 자료 폴더에 남긴다 — 지도에는 잰 값과 횟수만 올리고 원본은 여기 둔다. 자료 폴더가 없으면 null */
export function 기록남기기(자료: string | undefined, 함수: string, 인자: unknown[], r: 조작결과, 비밀들: readonly string[], 지금 = new Date()): string | null {
  if (!자료 || !폴더인가(자료)) return null;
  const 폴더 = join(자료, 조작기록자리);
  try {
    mkdirSync(폴더, { recursive: true, mode: 0o755 });
  } catch (e) {
    r.못한것.push(`기록 남기기: ${까닭(e)}`);
    return null;
  }
  if (!폴더인가(폴더)) return null;
  const 이름 = `${지금.toISOString().replace(/\D/g, '').slice(0, 17)}-${함수}`;
  const { 화면, 배율: _배율, 배율바꿈: _바꿈, 통신오류: _통신, 입력못놓음: _놓음, ...글 } = r;
  try {
    let 날글: string;
    try {
      날글 = JSON.stringify({ 함수, 인자, ...글 }, null, 2);
    } catch {
      날글 = JSON.stringify({ 함수, 인자, ...글, 값: `(JSON 으로 못 바꾸는 값 — ${String(글.값)})` }, null, 2);
    }
    // wx — 자식이 만든 링크를 따라 쓰지 않는다
    writeFileSync(join(폴더, `${이름}.json`), 비밀가리기(날글, 비밀들), { flag: 'wx' });
    if (화면 !== undefined) writeFileSync(join(폴더, `${이름}.jpg`), 화면, { flag: 'wx' });
    return join(폴더, 이름);
  } catch (e) {
    r.못한것.push(`기록 남기기: ${까닭(e)}`);
    return null;
  }
}

export const 몇줄 = (머리: string, 줄들: readonly string[]): string[] =>
  줄들.length === 0 ? [] : [`${머리} ${줄들.length}줄`, ...줄들.slice(0, 찍을줄).map((x) => `  ${x.split('\n')[0]!.slice(0, 줄길이)}`), ...(줄들.length > 찍을줄 ? [`  … 나머지는 기록 파일에 있다`] : [])];
