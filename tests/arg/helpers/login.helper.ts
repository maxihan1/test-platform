import type { GameDriver } from '@platform/kit';

import { 오른쪽위버튼 } from '../components/corner.component.js';
import { 공통HUD } from '../components/hud.component.js';
import { 안내창 } from '../components/popup.component.js';
import { 던전 } from '../pages/dungeon.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 로비 } from '../pages/lobby.page.js';

const 화면기다림 = 120_000;

export async function 접속끝날때까지(game: GameDriver): Promise<void> {
  const 끝 = Date.now() + 60_000;
  while (Date.now() < 끝) {
    const 버튼 = await game.find(로그인화면.게임시작);
    if (버튼 === null || 버튼.interactable === true) return;
    if ((await game.find(로비.제목)) !== null) return;
    await game.waitFor(로비.제목, { timeoutMs: 3_000 }).catch(() => undefined);
  }
}

async function 지금화면(game: GameDriver): Promise<'로그인' | '로비' | '던전' | '모름'> {
  await 접속끝날때까지(game);
  if ((await game.find(로그인화면.게임시작)) !== null) return '로그인';
  if ((await game.find(로비.제목)) !== null) return '로비';
  if ((await game.find(던전.행동막대)) !== null) return '던전';
  return '모름';
}

export async function 열린창닫기(game: GameDriver): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    const 창 = await game.find('/Showcase HUD/*[contains(@name,Window)]');
    if (창 === null) return;
    await game.click(`${창.path}/*/Button 닫기`);
    await game.waitFor(창.path, { gone: true, timeoutMs: 10_000 });
  }
}

export async function 안내창닫기(game: GameDriver): Promise<void> {
  await new 안내창(game).확인누르기();
}

export async function 메인메뉴로(game: GameDriver): Promise<로그인화면> {
  await 열린창닫기(game);
  const 화면 = await 지금화면(game);
  if (화면 === '로비' || 화면 === '던전') await new 오른쪽위버튼(game).메인메뉴로나가기();
  return 로그인화면.열기(game);
}

export async function 로그인화면까지(game: GameDriver): Promise<로그인화면> {
  await 안내창닫기(game);
  const 화면 = await 지금화면(game);
  if (화면 === '로그인') return 로그인화면.열기(game);
  return 메인메뉴로(game);
}

export async function 로비까지(game: GameDriver, 아이디: string, 비밀번호: string): Promise<로비> {
  await 안내창닫기(game);
  let 화면 = await 지금화면(game);
  if (화면 === '모름') {
    await game.waitFor('//*[contains(@name,Showcase)]', { timeoutMs: 화면기다림 });
    화면 = await 지금화면(game);
  }
  if (화면 === '로비' || 화면 === '던전') {
    const 이름 = await new 공통HUD(game).캐릭터이름();
    if (화면 === '로비' && 이름 === 아이디.trim()) {
      await 열린창닫기(game);
      return 로비.열기(game);
    }
    await 메인메뉴로(game);
  }
  const 로그인 = await 로그인화면.열기(game);
  await 로그인.로그인(아이디, 비밀번호);
  return 로비.열기(game);
}

export async function 던전까지(game: GameDriver, 아이디: string, 비밀번호: string, 직업 = '탱커'): Promise<던전> {
  if ((await 지금화면(game)) === '던전' && (await new 공통HUD(game).캐릭터이름()) === 아이디.trim() && 직업 === '탱커') {
    await 열린창닫기(game);
    return 던전.열기(game);
  }
  const 대기실 = await 로비까지(game, 아이디, 비밀번호);
  await 대기실.직업고르기(직업);
  await 대기실.준비누르기();
  return 던전.열기(game);
}
