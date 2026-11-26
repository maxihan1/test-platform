import type { GameDriver } from '@platform/kit';

import { 메인메뉴화면 } from '../pages/main-menu.page.js';
import { 인원수선택창 } from '../pages/player-count.page.js';
import { 환경설정창 } from '../pages/setting.page.js';
import { 글읽기 } from './menu.helper.js';


export async function 글읽어보기(읽기: () => Promise<string>): Promise<string> {
  return await 읽기().catch(() => '');
}

export async function 글이바뀔때까지(game: GameDriver, 주소: string, 앞글: string, 한도ms = 10_000): Promise<string> {
  const 끝 = Date.now() + 한도ms;
  let 글 = await 글읽어보기(async () => await 글읽기(game, 주소));
  while (글 === 앞글 && Date.now() < 끝) 글 = await 글읽어보기(async () => await 글읽기(game, 주소));
  return 글;
}

export async function 환경설정창열기(game: GameDriver): Promise<환경설정창> {
  const 메뉴 = await 메인메뉴화면.열기(game);
  await 메뉴.환경설정누르기();
  return await 환경설정창.기다리기(game);
}

export async function 열린환경설정창(game: GameDriver): Promise<환경설정창> {
  const 창 = await 환경설정창.기다리기(game);
  if (!(await 창.열렸나())) throw new Error('「환경설정」 창이 열려 있지 않습니다');
  return 창;
}

export async function 인원수창열기(game: GameDriver): Promise<인원수선택창> {
  const 메뉴 = await 메인메뉴화면.열기(game);
  await 메뉴.빠른시작누르기();
  return await 인원수선택창.기다리기(game);
}

export async function 언어를한국어로(game: GameDriver): Promise<void> {
  const 창 = await 환경설정창열기(game);
  for (let 번 = 0; 번 < 12 && (await 창.언어()) !== '한국어'; 번 += 1) await 창.언어바꾸기('왼쪽');
  await 창.닫기();
  await 창.닫힐때까지();
}
