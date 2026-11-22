import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 안내창 } from '../components/popup.component.js';
import { 던전화면 } from '../pages/dungeon.page.js';
import { type 직업, 로비화면 } from '../pages/lobby.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 로비로되돌리기 } from './game-state.helper.js';

let 들어간계정: string | null = null;

async function 로그인됐나(game: GameDriver): Promise<boolean> {
  return (await game.find('/Showcase HUD/PlayerBar')) !== null;
}

export async function 로그인하기(game: GameDriver, 아이디: string, 비밀번호: string): Promise<로비화면 | null> {
  if (await 로그인됐나(game)) {
    if (process.env.PLATFORM_SCENARIO_MODE === '1' && 들어간계정 === 아이디 && (await game.find(로비화면.준비버튼)) !== null) return 로비화면.열림(game);
    await game.restart();
  }
  const 화면 = await 로그인화면.열림(game);
  const 창 = new 안내창(game);
  if (await 창.보이나()) await 창.확인누르기();
  for (let 시도 = 0; 시도 < 3; 시도 += 1) {
    await 화면.넣고시작(아이디, 비밀번호);
    들어간계정 = 아이디;
    if (await 화면.로비뜰때까지(30_000)) return 로비화면.열림(game);
    if (!(await 창.보이나()) || !(await 창.본문()).includes('이미 접속')) return null;
    await 창.확인누르기();
  }
  return null;
}

export function 로그아웃했다(): void {
  들어간계정 = null;
}

export async function 던전입장(game: GameDriver, 이름: 직업 = '탱커'): Promise<던전화면> {
  const 로비 = await 로비화면.열림(game);
  await 로비.던전들어가기(로비화면.직업자리[이름]);
  const 던전 = await 던전화면.안내창뜸(game);
  await 던전.안내창닫기();
  return 던전;
}

export async function 방로비로(admin: APIRequestContext, game: GameDriver): Promise<로비화면> {
  await 로비로되돌리기(admin);
  return 로비화면.열림(game, 45_000);
}
