import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 상점창 } from '../pages/shop.page.js';

async function 창닫기(game: GameDriver, 창: string): Promise<void> {
  if ((await game.find(창)) === null) return;
  await game.click(`${창}/*/Button 닫기`);
  await game.waitFor(창, { gone: true, timeoutMs: 10_000 });
}

export async function 사기(game: GameDriver, 이름: string, 개수: number): Promise<void> {
  const hud = new 공통HUD(game);
  const 상점 = await 상점창.열기(game);
  for (let i = 0; i < 개수; i += 1) {
    const 앞골드 = await hud.골드();
    await 상점.구매누르기(이름);
    const 됐나 = await 상점.보유골드가될때까지(앞골드 - (await 상점.가격(이름)));
    if (!됐나) throw new Error(`「${이름}」을 사지 못했다 — 보유 골드 ${String(앞골드)}`);
  }
  await 창닫기(game, 상점창.창);
}

export async function 가진개수(game: GameDriver, 이름: string): Promise<number> {
  const 가방 = await 가방창.열기(game);
  const 수 = (await 가방.줄개수(이름)) > 1 ? await 가방.줄개수(이름) : await 가방.묶음수(이름);
  await 창닫기(game, 가방창.창);
  return 수;
}

export async function 개수맞추기(game: GameDriver, 이름: string, 개수: number): Promise<void> {
  let 지금 = await 가진개수(game, 이름);
  if (지금 < 개수) await 사기(game, 이름, 개수 - 지금);
  if (지금 > 개수) {
    const 가방 = await 가방창.열기(game);
    while (지금 > 개수) {
      await 가방.판매하기(이름);
      지금 -= 1;
      await game.waitFor(가방창.능력줄, { timeoutMs: 10_000 });
      await new 공통HUD(game).알림.뜨는지(`${이름} 판매`);
    }
    await 창닫기(game, 가방창.창);
  }
}

export async function 무기장착(game: GameDriver, 이름: string): Promise<void> {
  const 가방 = await 가방창.열기(game);
  if ((await 가방.칸이름('무기')) !== 이름) {
    if ((await 가방.줄찾기(이름)) < 0) {
      await 창닫기(game, 가방창.창);
      await 사기(game, 이름, 1);
      await 가방창.열기(game);
    }
    await 가방.장착하기(이름);
    await game.waitFor(`${가방창.칸('무기')}/Label[1]/Text`, { text: 이름, timeoutMs: 10_000 });
  }
  await 창닫기(game, 가방창.창);
}

export async function 무기해제(game: GameDriver): Promise<void> {
  const 가방 = await 가방창.열기(game);
  if (await 가방.해제있는지('무기')) {
    await 가방.해제누르기('무기');
    await game.waitFor(`${가방창.칸('무기')}/Label[1]/Text`, { text: '비어 있음', timeoutMs: 10_000 });
  }
  await 창닫기(game, 가방창.창);
}
