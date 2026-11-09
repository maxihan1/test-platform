import type { GameDriver } from '@platform/kit';

import { 새캐릭터창 } from '../pages/character-create.page.js';
import { 캐릭터선택화면 } from '../pages/character-select.page.js';
import { 캐릭터정보창 } from '../pages/character-info.page.js';
import { 강화창 } from '../pages/enhance.page.js';
import { GM콘솔 } from '../pages/gm-console.page.js';
import { 가방창 } from '../pages/inventory.page.js';
import { 아이템설명창 } from '../pages/item-detail.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 서버설정창 } from '../pages/server-settings.page.js';
import { 상점창 } from '../pages/shop.page.js';
import { 월드화면 } from '../pages/world.page.js';
import { 게임에들어갔다 } from './game-state.helper.js';

export function 대상서버(): string {
  const 주소 = process.env.PLATFORM_BASE_URL;
  if (주소 === undefined || 주소 === '') throw new Error('게임이 붙을 대상 서버 주소(PLATFORM_BASE_URL)가 없다');
  return 주소.replace(/\/+$/, '');
}

async function 월드에서나가기(game: GameDriver): Promise<캐릭터선택화면 | undefined> {
  const 월드 = new 월드화면(game);
  const 선택 = new 캐릭터선택화면(game);
  const 끝 = Date.now() + 60_000;
  while (!(await 월드.떠있나()) && !(await 선택.떠있나()) && (await game.find(로그인화면.창)) === null) {
    if (Date.now() >= 끝) throw new Error('게임 화면(월드 · 캐릭터 선택 · 로그인)이 60초 안에 뜨지 않았다');
    await new Promise((깨운다) => setTimeout(깨운다, 300));
  }
  if (await 월드.떠있나()) {
    for (const 창 of [new 아이템설명창(game), new 가방창(game), new 캐릭터정보창(game), new 상점창(game), new 강화창(game), new GM콘솔(game)]) {
      if (await 창.떠있나()) await 창.닫기누르기();
    }
    await 월드.나가기누르기();
    await 캐릭터선택화면.열기(game);
  }
  if (!(await 선택.떠있나())) return undefined;
  const 만들기 = new 새캐릭터창(game);
  if (await 만들기.떠있나()) await 만들기.취소누르기();
  if (await 선택.삭제확인창떠있나()) await 선택.삭제취소누르기();
  return 선택;
}

export async function 서버맞추기(game: GameDriver): Promise<로그인화면> {
  const 선택 = await 월드에서나가기(game);
  if (선택 !== undefined) await 선택.로그아웃누르기();
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
  const 선택 = await 월드에서나가기(game);
  if (선택 !== undefined && process.env.PLATFORM_SCENARIO_MODE === '1' && 로그인화면.들어온아이디() === 누구.아이디) return 선택;
  const 화면 = await 서버맞추기(game);
  await 화면.아이디적기(누구.아이디);
  await 화면.비밀번호적기(누구.비밀번호);
  await 화면.로그인누르기();
  return 캐릭터선택화면.열기(game);
}

export async function 게임입장(game: GameDriver, 누구: { 아이디: string; 비밀번호: string; 이름: string }): Promise<월드화면> {
  const 선택 = await 로그인하기(game, 누구);
  await 선택.칸뜰때까지(누구.이름);
  await 선택.게임시작누르기(누구.이름);
  const 월드 = await 월드화면.열기(game);
  게임에들어갔다(누구.아이디);
  return 월드;
}
