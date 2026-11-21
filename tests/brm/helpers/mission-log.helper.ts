import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 던전화면 } from '../pages/dungeon.page.js';
import { 자리고르기, 조작안내닫기 } from './game-enter.helper.js';
import { type 로그사람, type 로그적, type 로그줄, 레벨맞추기, 로그읽기, 봇시키기, 불러내기, 열린창닫기, 적모두처치 } from './game-state.helper.js';

export type { 로그줄 } from './game-state.helper.js';

type 쪽 = 로그사람 | 로그적 | undefined;

const 사람아이디 = (값: 쪽): string | null => (값 !== undefined && 'user' in 값 ? 값.user : null);
const 적이름 = (값: 쪽): string | null => (값 !== undefined && 'npc' in 값 ? 값.npc : null);

export function 미션로그(admin: APIRequestContext): (since: number | null) => Promise<{ last: number; lines: 로그줄[] }> {
  return (since) => 로그읽기(admin, since);
}

export function 반올림(값: number): number {
  const 아래 = Math.floor(값);
  const 나머지 = 값 - 아래;
  if (Math.abs(나머지 - 0.5) < 1e-9) return 아래 % 2 === 0 ? 아래 : 아래 + 1;
  return 나머지 > 0.5 ? 아래 + 1 : 아래;
}

export function 준피해(줄들: 로그줄[], 아이디: string, 스킬: string): 로그줄[] {
  return 줄들.filter((줄) => 줄.kind === 'hit' && 사람아이디(줄.from) === 아이디 && 적이름(줄.to) !== null && 줄.skill === 스킬);
}

export function 받은피해(줄들: 로그줄[], 아이디: string, 적: string): 로그줄[] {
  return 줄들.filter((줄) => 줄.kind === 'hit' && 사람아이디(줄.to) === 아이디 && 적이름(줄.from) === 적);
}

export function 회복줄(줄들: 로그줄[], 아이디: string, 스킬: string): 로그줄[] {
  return 줄들.filter((줄) => 줄.kind === 'heal' && 사람아이디(줄.from) === 아이디 && 줄.skill === 스킬);
}

export function 처치줄(줄들: 로그줄[], 아이디: string, 적: string): 로그줄[] {
  return 줄들.filter((줄) => 줄.kind === 'kill' && 사람아이디(줄.by) === 아이디 && 줄.npc === 적);
}

export function 처치마다전리품(줄들: 로그줄[], 아이디: string, 적: string): string[][] {
  const 묶음: string[][] = [];
  for (const 줄 of 줄들) {
    if (사람아이디(줄.by) !== 아이디) continue;
    if (줄.kind === 'kill') {
      if (줄.npc === 적) 묶음.push([]);
      else 묶음.push(['(다른 적)']);
    } else if (줄.kind === 'item' && 줄.players > 0 && 줄.item !== undefined) {
      묶음.at(-1)?.push(줄.item);
    }
  }
  return 묶음.filter((x) => x[0] !== '(다른 적)');
}

export interface 시작조건 {
  레벨: number;
  직업: string;
  무기: string;
  갑옷: string;
  인원: number;
}

export function 설명안되는줄(줄들: 로그줄[], 아이디: string, 조건: 시작조건, 볼종류: 로그줄['kind'][]): 로그줄[] {
  return 줄들.filter((줄) => {
    const 나 = [줄.from, 줄.to, 줄.by].find((x) => 사람아이디(x) === 아이디) as 로그사람 | undefined;
    if (나 === undefined) return false;
    if (!볼종류.includes(줄.kind)) return true;
    return 줄.players !== 조건.인원 || 나.level !== 조건.레벨 || 나.job !== 조건.직업 || 나.weapon !== 조건.무기 || 나.armor !== 조건.갑옷;
  });
}

export async function 적치우고레벨맞추기(game: GameDriver, 레벨: number): Promise<void> {
  await 적모두처치(game);
  if (!(await new 던전화면(game).임프다사라질때까지(30_000))) throw new Error('「/gm killall」 뒤 임프가 30초 안에 다 사라지지 않았습니다');
  await 레벨맞추기(game, 레벨);
}

export async function 임프있게하기(game: GameDriver): Promise<void> {
  if ((await game.find(던전화면.첫임프)) !== null) return;
  await 불러내기(game, 'imp');
  await game.waitFor(던전화면.첫임프, { timeoutMs: 15_000 });
}

export async function 맞을때까지기다리기(game: GameDriver, 한도ms = 8_000): Promise<boolean> {
  return game.waitFor(던전화면.내피해숫자, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 켜둔봇과던전으로(game: GameDriver, admin: APIRequestContext, 봇들: { 아이디: string; 자리: number }[], 내자리: number): Promise<void> {
  await 열린창닫기(game);
  for (const 봇 of 봇들) {
    await 봇시키기(admin, 봇.아이디, `seat:${String(봇.자리)}`);
    await 봇시키기(admin, 봇.아이디, 'ready');
  }
  await 자리고르기(game, 내자리);
  await game.click('Ready Btn');
  await game.waitFor(던전화면.조작안내확인, { timeoutMs: 90_000 });
  await 조작안내닫기(game);
}

export async function 회복뜰때까지기다리기(game: GameDriver, 한도ms = 8_000): Promise<boolean> {
  return game.waitFor(던전화면.회복숫자, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}
