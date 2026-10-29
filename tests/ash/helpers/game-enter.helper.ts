import type { GameDriver } from '@platform/kit';

import { 캐릭터선택화면 } from '../pages/character-select.page.js';
import { 강화창 } from '../pages/enhance.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 서버설정창 } from '../pages/server-settings.page.js';
import { 상점창 } from '../pages/shop.page.js';
import { 월드화면 } from '../pages/world.page.js';
import { 게임에들어갔다, 들어간캐릭터 } from './game-state.helper.js';

export function 대상서버(): string {
  const 주소 = process.env.PLATFORM_BASE_URL;
  if (주소 === undefined || 주소 === '') throw new Error('게임이 붙을 대상 서버 주소(PLATFORM_BASE_URL)가 없다');
  return 주소.replace(/\/+$/, '');
}

export async function 서버맞추기(game: GameDriver): Promise<로그인화면> {
  const 화면 = await 로그인화면.열기(game);
  if (!(await 화면.서버글()).includes(대상서버())) {
    const 창 = await 서버설정창.열기(game);
    await 창.주소적기(대상서버());
    await 창.저장누르기();
    await 창.닫힐때까지();
  }
  return 화면;
}

export async function 로그인하기(game: GameDriver, 누구: { 아이디: string; 비밀번호: string }): Promise<캐릭터선택화면> {
  const 화면 = await 서버맞추기(game);
  await 화면.아이디적기(누구.아이디);
  await 화면.비밀번호적기(누구.비밀번호);
  await 화면.로그인누르기();
  return 캐릭터선택화면.열기(game);
}

export async function 게임입장(game: GameDriver, 누구: { 아이디: string; 비밀번호: string; 이름: string }): Promise<월드화면> {
  if (들어간캐릭터()?.아이디 === 누구.아이디) {
    const 상점 = new 상점창(game);
    if (await 상점.떠있나()) await 상점.닫기누르기();
    const 강화 = new 강화창(game);
    if (await 강화.떠있나()) await 강화.닫기누르기();
    await new 월드화면(game).나가기누르기();
    const 다시 = await 캐릭터선택화면.열기(game);
    await 다시.칸뜰때까지(누구.이름);
    await 다시.게임시작누르기(누구.이름);
    const 월드 = await 월드화면.열기(game);
    게임에들어갔다(누구.아이디);
    return 월드;
  }
  const 선택 = await 로그인하기(game, 누구);
  await 선택.칸뜰때까지(누구.이름);
  await 선택.게임시작누르기(누구.이름);
  const 월드 = await 월드화면.열기(game);
  게임에들어갔다(누구.아이디);
  return 월드;
}
