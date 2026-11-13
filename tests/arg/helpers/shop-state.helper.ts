import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 색벗기기 } from './find.helper.js';
import { 가진개수, 무기장착, 무기해제, 사기 } from './items.helper.js';

export async function 처음무기읽기(game: GameDriver): Promise<string> {
  const 가방 = await 가방창.열기(game);
  const 이름 = await 가방.칸이름('무기');
  await 가방.닫기누르기();
  return 이름;
}

export async function 무기되돌리기(game: GameDriver, 처음무기: string): Promise<void> {
  if (처음무기 === '비어 있음') await 무기해제(game);
  else await 무기장착(game, 처음무기);
}

export async function 가방에채우기(game: GameDriver, 이름: string, 개수: number): Promise<void> {
  const 지금 = await 가진개수(game, 이름);
  if (지금 < 개수) await 사기(game, 이름, 개수 - 지금);
}

export async function 알림자리(game: GameDriver, 알림주소: string): Promise<{ 가운데: boolean; 위쪽: boolean }> {
  const 찾음 = await game.find(알림주소);
  const x = 찾음?.x;
  const y = 찾음?.y;
  const 화면 = 찾음?.screen;
  if (x === undefined || y === undefined || 화면 === undefined) return { 가운데: false, 위쪽: false };
  return { 가운데: Math.abs(x - 화면[0] / 2) <= 화면[0] * 0.1, 위쪽: y >= (화면[1] * 2) / 3 };
}

export async function 상단바레벨(hud: 공통HUD): Promise<number> {
  const 맞음 = /Lv\.(\d+)/.exec(색벗기기(await hud.레벨이름글()));
  return 맞음 === null ? -1 : Number(맞음[1]);
}
