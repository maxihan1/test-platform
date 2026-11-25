import type { GameDriver } from '@platform/kit';

import { 식물이름, 캐릭터선택화면 } from '../pages/char-select.page.js';
import { 인원수선택창 } from '../pages/player-count.page.js';
import { 메인메뉴화면 } from '../pages/main-menu.page.js';
import { 맵선택창 } from '../pages/map-select.page.js';
import { 스테이지화면 } from '../pages/stage.page.js';
import { 튜토리얼장면 } from '../pages/tutorial.page.js';

export const 기본식물차례: readonly 식물이름[] = ['Twin', 'Fire', 'Slow'];

export async function 캐릭터선택까지(game: GameDriver): Promise<캐릭터선택화면> {
  const 메뉴 = await 메인메뉴화면.열기(game);
  await 메뉴.빠른시작누르기();
  const 인원수 = await 인원수선택창.기다리기(game);
  await 인원수.누르기('1P');
  return await 캐릭터선택화면.기다리기(game);
}

export async function 맵선택까지(game: GameDriver, 차례: readonly 식물이름[] = 기본식물차례): Promise<맵선택창> {
  const 선택 = await 캐릭터선택까지(game);
  await 선택.고양이고르기();
  await 선택.칸채우기(차례);
  await 선택.준비뜰때까지();
  await 선택.준비누르기();
  return await 맵선택창.기다리기(game);
}

export async function 스테이지까지(game: GameDriver, 차례: readonly 식물이름[] = 기본식물차례): Promise<스테이지화면> {
  const 맵 = await 맵선택까지(game, 차례);
  await 맵.들어가기();
  return await 스테이지화면.기다리기(game);
}

export async function 튜토리얼까지(game: GameDriver): Promise<튜토리얼장면> {
  const 메뉴 = await 메인메뉴화면.열기(game);
  await 메뉴.튜토리얼누르기();
  return await 튜토리얼장면.기다리기(game);
}
