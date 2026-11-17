import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 던전화면 } from '../pages/dungeon.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 로비화면 } from '../pages/lobby.page.js';

type 지금 = '로그인' | '로비' | '던전' | '모름';

export async function 지금화면(game: GameDriver, 시간 = 120_000): Promise<지금> {
  const 끝 = Date.now() + 시간;
  do {
    if ((await game.find(로그인화면.게임시작).catch(() => null)) !== null) return '로그인';
    if ((await game.find(던전화면.행동막대).catch(() => null)) !== null) return '던전';
    if ((await game.find(로비화면.준비).catch(() => null)) !== null) return '로비';
  } while (Date.now() < 끝);
  return '모름';
}

export async function 들어온이름(game: GameDriver): Promise<string> {
  return (await new 공통HUD(game).레벨이름글()).replace(/^Lv\.\d+\s*/, '');
}

export async function 로그인하기(game: GameDriver, 아이디: string, 비밀번호: string): Promise<void> {
  const 자리 = await 지금화면(game);
  if (자리 !== '로그인' && (await 들어온이름(game)) === 아이디.trim()) return;
  if (자리 !== '로그인') throw new Error(`다른 계정으로 들어와 있다 — ${자리}`);
  const 화면 = 로그인화면.지금(game);
  await 화면.로그인(아이디, 비밀번호);
  await game.waitFor(공통HUD.상단바, { timeoutMs: 60_000 });
}

export async function 로비로(game: GameDriver, 아이디: string, 비밀번호: string): Promise<로비화면> {
  await 로그인하기(game, 아이디, 비밀번호);
  return await 로비화면.열기(game);
}

export async function 던전으로(game: GameDriver, 아이디: string, 비밀번호: string, 카드 = 0, 안내닫기 = true): Promise<던전화면> {
  await 로그인하기(game, 아이디, 비밀번호);
  if ((await game.find(던전화면.행동막대)) === null) {
    const 로비 = await 로비화면.열기(game);
    await 로비.카드누르기(카드);
    await 로비.준비누르기();
  }
  const 던전 = await 던전화면.열기(game, 90_000);
  if (안내닫기) {
    await game.waitFor(던전화면.조작안내확인, { timeoutMs: 15_000 }).catch(() => undefined);
    await 던전.조작안내닫기();
  }
  return 던전;
}

export async function 상단바레벨(game: GameDriver): Promise<number> {
  const 글 = 글만(await game.text(공통HUD.레벨이름));
  return Number(/Lv\.(\d+)/.exec(글)?.[1] ?? 'NaN');
}
