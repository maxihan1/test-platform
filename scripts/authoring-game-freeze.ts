// 멈춰 가며 하기 표시 — 조작 함수가 끝나 게임을 멈췄다는 표시와 다음에 부를 때 풀 시간 배율을 자료 폴더에 둔다 (도메인/게임 §3.10 「조작 도우미」)
// 표시가 있어야만 푼다 — 게임이 스스로 멈춘 화면(일시정지 · 고르기 창)을 덮지 않으려고 멈춘 쪽이 흔적을 남긴다
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

export interface 멈춤표시 {
  /** 풀 때 되돌릴 시간 배율 */
  배율: number;
  때: string;
}

/**
 * 이보다 오래된 표시는 버린다 — 잡기 한 번이 30분이다. 표시는 디바이스를 놓을 때 지우지만(authoring-learn), 자식이 스스로 놓았거나 에이전트가 죽으면 남는다.
 * 남은 표시가 새로 켠 게임의 일시정지 화면을 풀어 버리면 안 된다
 */
const 낡음ms = 30 * 60_000;

/** 없거나 꼴이 틀리거나(링크 · 큰 파일 · 깨진 글) 낡았으면 null — 표시가 없는 것과 같다 */
export function 멈춤표시읽기(자료: string, 지금 = Date.now()): 멈춤표시 | null {
  const 글 = 안전히읽기(자료, 게임자리.멈춤, 1_000);
  if (글 === null) return null;
  try {
    const x = JSON.parse(글) as { 배율?: unknown; 때?: unknown } | null;
    if (typeof x?.배율 !== 'number' || !Number.isFinite(x.배율) || typeof x.때 !== 'string') return null;
    // 때를 못 읽으면(NaN) 견줌이 거짓이라 낡은 것으로 친다
    return 지금 - Date.parse(x.때) <= 낡음ms ? { 배율: x.배율, 때: x.때 } : null;
  } catch {
    return null;
  }
}

export function 멈춤표시쓰기(자료: string, 배율: number, 지금 = new Date()): void {
  새로쓰기(join(자료, 게임자리.멈춤), JSON.stringify({ 배율, 때: 지금.toISOString() }));
}

export function 멈춤표시지우기(자료: string): void {
  rmSync(join(자료, 게임자리.멈춤), { force: true, recursive: true });
}
