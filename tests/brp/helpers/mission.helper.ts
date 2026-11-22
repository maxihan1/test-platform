import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 던전화면 } from '../pages/dungeon.page.js';
import { 봇두기, 임프하나잡기 } from './dungeon.helper.js';
import { 던전입장 } from './game-enter.helper.js';
import { 로그읽기, type 로그줄 } from './game-log.helper.js';
import { 봇시키기, 봇켜기 } from './game-state.helper.js';
import { GM골드, GM레벨, GM모두처치, GM스탯, GM임프불러내기, GM전리품 } from './gm.helper.js';
import { 장비끼기 } from './items.helper.js';
import { 가방창 } from '../pages/bag.page.js';
import { 초대창 } from '../pages/invite.page.js';
import { 로비화면, type 직업 } from '../pages/lobby.page.js';

export interface 봇계정 {
  아이디: string;
  비밀번호: string;
}

export function 내로그(admin: APIRequestContext, 아이디: string): (since: number | null) => Promise<{ last: number; lines: 로그줄[] }> {
  return (since) => 로그읽기(admin, since, 아이디);
}

export async function 장비갖추기(game: GameDriver, 레벨: number, 장비: string | null): Promise<void> {
  await GM레벨(game, 레벨);
  if (장비 === null) return;
  await GM골드(game, 5000);
  await 장비끼기(game, 장비);
}

export async function 던전을비우고레벨맞추기(game: GameDriver, 레벨: number): Promise<void> {
  await GM모두처치(game);
  await GM레벨(game, 레벨);
}

export async function 봇과던전들어가기(
  admin: APIRequestContext,
  game: GameDriver,
  봇들: 봇계정[],
  내직업: 직업,
  자리들: number[] = [2, 6],
): Promise<{ 봇이름들: string[]; 던전: 던전화면 }> {
  const 봇이름들: string[] = [];
  for (const [i, 봇] of 봇들.entries()) 봇이름들.push(await 봇두기(admin, 봇.아이디, 봇.비밀번호, 자리들[i] ?? 2));
  const 던전 = await 던전입장(game, 내직업);
  return { 봇이름들, 던전 };
}

export async function 봇쓰러뜨리기(admin: APIRequestContext, 봇이름들: string[]): Promise<void> {
  for (const 봇 of 봇이름들) await 봇시키기(admin, 봇, 'gm:faint');
}

export async function 임프몇초치기(game: GameDriver, 던전: 던전화면, 버튼: '공격' | '스킬1', 초 = 5): Promise<void> {
  if (!(await 던전.임프있나())) await GM임프불러내기(game);
  const 끝 = Date.now() + 초 * 1000;
  while (Date.now() < 끝 && (await 던전.임프있나())) {
    try {
      await 던전.대상고르기(던전화면.임프);
    } catch (e) {
      if (e instanceof Error && e.message.includes('없습니다')) continue;
      throw e;
    }
    if (버튼 === '공격') await 던전.공격누르기();
    else await 던전.스킬1누르기();
  }
}

export async function 임프곁에서기(game: GameDriver, 던전: 던전화면): Promise<void> {
  if (!(await 던전.임프있나())) await GM임프불러내기(game);
  await GM스탯(game);
}

export async function 몇초서있기(game: GameDriver): Promise<void> {
  await GM스탯(game);
}

export function 알려진줄(인원: number): (l: 로그줄) => boolean {
  return (l) => ['hit', 'kill', 'item', 'levelup', 'heal'].includes(l.kind) && l.players === 인원;
}

export async function 켠봇과던전들어가기(admin: APIRequestContext, game: GameDriver, 봇이름들: string[], 내직업: 직업): Promise<던전화면> {
  for (const 봇 of 봇이름들) {
    await 봇시키기(admin, 봇, 'seat:2');
    await 봇시키기(admin, 봇, 'ready');
  }
  return 던전입장(game, 내직업);
}

export async function 봇과파티맺기(admin: APIRequestContext, game: GameDriver, 봇: 봇계정, 내아이디: string): Promise<string> {
  const 이름 = await 봇켜기(admin, 봇.아이디, 봇.비밀번호);
  await 로비화면.열림(game);
  await 봇시키기(admin, 이름, `party_invite:${내아이디}`);
  const 창 = await 초대창.뜰때까지(game);
  if (창 === null) throw new Error(`${이름} 의 파티 초대 창이 15초 안에 안 떴습니다`);
  await 창.수락누르기();
  await 창.닫힐때까지();
  return 이름;
}

export async function 용비늘갑옷끼기(game: GameDriver, 던전: 던전화면): Promise<void> {
  await GM모두처치(game);
  await GM전리품(game, '용비늘 갑옷');
  const 잡음 = await 임프하나잡기(game, 던전);
  await GM전리품(game, 'off');
  if (!잡음) throw new Error('용비늘 갑옷을 떨어뜨릴 임프를 잡지 못했습니다');
  const 가방 = await 가방창.열기(game);
  await 가방.줄이생길때까지('용비늘 갑옷');
  await 가방.장착하기('용비늘 갑옷');
  await 가방.칸이될때까지('갑옷', '용비늘 갑옷');
  await 가방.닫기();
}

export async function 동료치유하기(game: GameDriver, 던전: 던전화면): Promise<void> {
  await 던전.동료초상화누르기();
  await 던전.스킬1누르기();
  await GM스탯(game);
}
