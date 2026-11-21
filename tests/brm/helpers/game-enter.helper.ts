import type { GameDriver } from '@platform/kit';

import { 보스방가기, 보스처치, 체력채우기, type 계정 } from './game-state.helper.js';

export const 꾸러미 = 'com.maxihan.bossroom';

export interface 앱제어 {
  terminateApp(앱: string): Promise<unknown>;
  activateApp(앱: string): Promise<unknown>;
}

export type 지금화면종류 = '로그인' | '로비' | '던전' | '결과' | '모름';

const 로그인창 = '/Showcase Login/Panel 로그인';
const 안내창확인 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/Confirm Button';
const 조작안내확인 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Confirmation Button';

export async function 지금화면(game: GameDriver): Promise<지금화면종류> {
  if ((await game.find('/PostGameUICanvas')) !== null) return '결과';
  if ((await game.find('/BossRoomHudCanvas')) !== null) return '던전';
  if ((await game.find('/CharacterSelectCanvas')) !== null) return '로비';
  if ((await game.find(로그인창)) !== null) return '로그인';
  return '모름';
}

export async function 내이름(game: GameDriver): Promise<string | null> {
  const 줄 = await game.find('/Showcase HUD/PlayerBar/Label[0]/Text');
  if (줄 === null) return null;
  const 글 = (줄.text ?? '').replace(/<[^>]+>/g, '').trim();
  return 글.split(/\s+/).at(-1) ?? null;
}

export async function 게임다시켜기(game: GameDriver, driver: 앱제어): Promise<void> {
  await driver.terminateApp(꾸러미);
  await driver.activateApp(꾸러미);
  await game.waitForValue(`${로그인창}/Button 게임 시작`, 'Button.interactable', true, { timeoutMs: 120_000 });
}

export async function 안내창닫기(game: GameDriver): Promise<void> {
  if ((await game.find(안내창확인)) !== null) {
    await game.click(안내창확인);
    await game.waitFor('/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)', { gone: true, timeoutMs: 10_000 });
  }
}

export async function 다시연결될때까지(game: GameDriver, 한도ms = 90_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    const 안내 = await game.find('/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)');
    const 상단바 = await game.find('/Showcase HUD/PlayerBar');
    if (안내 === null && 상단바 !== null) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 로그인칸채우고시작(game: GameDriver, 아이디: string, 비밀번호: string): Promise<void> {
  await 안내창닫기(game);
  await game.type(`${로그인창}/Input 아이디`, 아이디);
  await game.type(`${로그인창}/Input 비밀번호`, 비밀번호);
  await game.click(`${로그인창}/Button 게임 시작`);
}

export async function 로그인하기(game: GameDriver, driver: 앱제어, 누구: 계정): Promise<void> {
  const 화면 = await 지금화면(game);
  if (화면 === '로비' || 화면 === '던전' || 화면 === '결과') {
    if ((await 내이름(game)) === 누구.아이디) return;
    await 게임다시켜기(game, driver);
  } else if (화면 === '모름') {
    await 게임다시켜기(game, driver);
  }
  await 로그인칸채우고시작(game, 누구.아이디, 누구.비밀번호);
  await game.waitFor('/Showcase HUD/PlayerBar', { timeoutMs: 60_000 });
}

export async function 장면이자리잡을때까지(game: GameDriver, 한도ms = 60_000): Promise<지금화면종류> {
  const 끝 = Date.now() + 한도ms;
  let 화면 = await 지금화면(game);
  while (Date.now() < 끝) {
    if (화면 === '로비' && (await game.find('Ready Btn')) !== null) return 화면;
    if (화면 === '던전' && (await game.find('/BossRoomHudCanvas/Hero Action Bar')) !== null) return 화면;
    if (화면 === '결과') return 화면;
    화면 = await 지금화면(game);
  }
  return 화면;
}

export async function 로비로(game: GameDriver, driver: 앱제어, 누구: 계정): Promise<void> {
  await 로그인하기(game, driver, 누구);
  if ((await 장면이자리잡을때까지(game)) === '던전') {
    await game.waitFor('/BossRoomHudCanvas/Hero Action Bar', { timeoutMs: 30_000 });
    await 조작안내닫기(game);
    await 체력채우기(game);
    await 보스방가기(game);
    await 보스처치(game);
  }
  await game.waitFor('/CharacterSelectCanvas', { timeoutMs: 60_000 });
  await game.waitFor('Ready Btn', { timeoutMs: 30_000 });
}

export async function 자리고르기(game: GameDriver, 자리: number): Promise<void> {
  await game.click(`/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(자리)})/AnimationContainer/ClickInteract`);
}

export async function 던전으로(game: GameDriver, driver: 앱제어, 누구: 계정, 자리 = 0): Promise<void> {
  if ((await 지금화면(game)) === '던전' && (await 내이름(game)) === 누구.아이디) {
    await 조작안내닫기(game);
    return;
  }
  await 로비로(game, driver, 누구);
  await 자리고르기(game, 자리);
  await game.click('Ready Btn');
  await game.waitFor(조작안내확인, { timeoutMs: 90_000 });
  await 조작안내닫기(game);
}

export async function 조작안내닫기(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 3 && (await game.find(조작안내확인)) !== null; 번 += 1) {
    await game.click(조작안내확인);
    const 닫힘 = await game.waitFor('/BossRoomHudCanvas/HowToPlayPopupPanel', { gone: true, timeoutMs: 4_000 }).then(
      () => true,
      () => false,
    );
    if (닫힘) return;
  }
  if ((await game.find('/BossRoomHudCanvas/HowToPlayPopupPanel')) !== null) throw new Error('조작 안내 창이 「확인」을 세 번 눌러도 닫히지 않았습니다');
}
