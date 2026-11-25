// 게임 학습이 디바이스를 쥐고 비켜 주는 손 — 쥐었나 · PC 를 기다리는 정식 실행이 있나 · 다시 빌 때까지 기다리기 (도메인/게임 §3.10 「게임 배우기」 디바이스 · 양보)
import { join } from 'node:path';

import { 잡은기록들 } from './authoring-app-hold.js';
import type { 앱화면 } from './authoring-app-screen.js';
import { 인증헤더 } from './authoring-io.js';
import { type 팜, 폰목록 } from './authoring-phone-farm.js';

/** control-cli 가 남긴 잡기 기록이 있나 — 못 잡고 끝난 세션 뒤에 「쥐고 있다」고 알리지 않게 세션마다 다시 본다 */
export const 쥐었나 = (트리: string): boolean => 잡은기록들(join(트리, '.control-cli'))?.includes('held') === true;

/**
 * PC 게임 — 빈 PC 를 기다리는 정식 실행이 있나(app-link 의 pcWaiting). 폰은 안 본다 — 정식 실행이 빈 폰을 기다리지 않는다.
 * 못 물어보면 없는 것으로 본다(다음 세션 앞에서 다시 묻는다). 서버가 팜 토큰을 기억해 두어 세션마다 물어도 새로 받지 않는다
 */
export async function PC기다리는실행(서버: { 주소기지: string; 토큰: string }, 번호: number, 앱: 앱화면 | undefined): Promise<boolean> {
  if (앱?.PC === undefined) return false;
  try {
    const 답 = await fetch(`${서버.주소기지}/api/authoring/requests/${String(번호)}/app-link`, { headers: 인증헤더(서버.토큰), signal: AbortSignal.timeout(30_000) });
    if (답.ok) return ((await 답.json()) as { pcWaiting?: unknown } | null)?.pcWaiting === true;
    console.error(`[작성] ${번호}번 — PC 를 기다리는 실행이 있는지 못 물어봤다: 서버 ${답.status}`);
  } catch (err) {
    console.error(`[작성] ${번호}번 — PC 를 기다리는 실행이 있는지 못 물어봤다: ${err instanceof Error ? err.name : '알 수 없는 오류'}`);
  }
  return false;
}

/**
 * 정식 실행에 PC 를 비켜 준 뒤 다시 빌 때까지 기다린다 — 비었으면 참, 한도까지 안 비면 거짓. 그만둘 일이 생기면 바로 참(부르는 쪽이 그것부터 본다).
 * 놓자마자 다시 잡으면 1분마다 잡아 보는 정식 실행보다 먼저 가져간다 — 처음에는 그보다 길게 쉰다
 */
export async function 빈PC기다리기(
  팜: () => 팜,
  그만두나: () => boolean,
  한도_ms = 120 * 60_000,
  쉬기: (ms: number) => Promise<unknown> = (ms) => new Promise((깨운다) => setTimeout(깨운다, ms)),
): Promise<boolean> {
  for (let 지남 = 0, 쉴 = 90_000; 지남 < 한도_ms; 지남 += 쉴, 쉴 = 60_000) {
    await 쉬기(쉴);
    if (그만두나()) return true;
    if ((await 폰목록(팜()))?.some((p) => p.serial.startsWith('pc-') && p.state === 'IDLE') === true) return true;
  }
  return false;
}
