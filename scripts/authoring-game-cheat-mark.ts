// 정보 모으기가 웨이브를 넘긴 판의 표시 — 그 뒤 같은 판에서 부른 조작 도우미 기록에 치트 표시를 달아 곳셈이 판으로 안 세게 한다 (도메인/게임 「게임 배우기」 「게임 정보 먼저 쌓기」 ③)
// 정보 모으기가 끝에 표시를 남기고, 조작 도우미가 기록을 남기기 전에 읽는다. 기록의 장면들에 표시와 다른 장면이 나오면(판을 떠남) 그 기록을 마지막으로 표시를 지운다
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

const 표시상한 = 4_096;

export interface 치트표시글 { 장면: string | null; 때: string }

/** 표시를 남긴다 — 웨이브를 넘긴 판의 장면. 못 쓰면 까닭 글 */
export function 치트표시쓰기(자료: string, 장면: string | null, 지금 = new Date()): string | null {
  try {
    새로쓰기(join(자료, 게임자리.치트표시), JSON.stringify({ 장면, 때: 지금.toISOString() } satisfies 치트표시글));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function 표시읽기(자료: string): 치트표시글 | null {
  try {
    const x = JSON.parse(안전히읽기(자료, 게임자리.치트표시, 표시상한) ?? 'null') as { 장면?: unknown; 때?: unknown } | null;
    return x === null || typeof x !== 'object' ? null : { 장면: typeof x.장면 === 'string' ? x.장면 : null, 때: typeof x.때 === 'string' ? x.때 : '' };
  } catch {
    return null;
  }
}

/**
 * 조작 도우미 판 기록에 치트 표시를 단다 — 표시가 있으면 이 기록은 웨이브를 넘긴 판의 이어짐이다.
 * 장면이 표시와 다르면(판을 떠났다) 이 기록을 마지막으로 표시를 지운다. 표시의 장면을 못 읽었으면(null) 장면으로는 안 지운다
 */
export function 판에치트달기(자료: string | undefined, r: { 장면들?: string[]; 치트?: true }): void {
  if (자료 === undefined) return;
  const 표시 = 표시읽기(자료);
  if (표시 === null) return;
  r.치트 = true;
  if (표시.장면 !== null && r.장면들?.some((x) => x !== 표시.장면) === true) rmSync(join(자료, 게임자리.치트표시), { force: true });
}
