import type { GameDriver } from '@platform/kit';

import { 던전 } from '../pages/dungeon.page.js';
import { 로비 } from '../pages/lobby.page.js';
import type { 채팅창 } from '../pages/chat.page.js';
import { 길드창 } from '../pages/guild.page.js';
import { 친구창 } from '../pages/friends.page.js';
import { 있는지 } from './find.helper.js';
import { 로비까지, 메인메뉴로 } from './login.helper.js';

export async function 새로접속(game: GameDriver, 아이디: string, 비밀번호: string): Promise<로비> {
  const 접속중 = (await 있는지(game, 로비.제목)) || (await 있는지(game, 던전.행동막대));
  if (접속중) await 메인메뉴로(game);
  return 로비까지(game, 아이디, 비밀번호);
}

export async function 전체채팅보내기(창: 채팅창, 글: string): Promise<boolean> {
  await 창.탭누르기('전체');
  const 앞줄수 = await 창.줄수();
  await 창.보내기하기(글);
  return 창.새줄이뜨는지(앞줄수, 글);
}

export async function 파티없음확인(game: GameDriver): Promise<boolean> {
  const 창 = await 친구창.열기(game);
  const 없다 = await 창.줄뜨는지('파티 없음');
  await 창.닫기누르기();
  return 없다;
}

export async function 길드없음확인(game: GameDriver): Promise<boolean> {
  const 창 = await 길드창.열기(game);
  const 없다 = await 창.길드없는지();
  await 창.닫기누르기();
  return 없다;
}
