import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 우편함창 } from '../pages/mail.page.js';
import { 채팅창 } from '../pages/chat.page.js';
import { 던전화면 } from '../pages/dungeon.page.js';
import { 로비화면 } from '../pages/lobby.page.js';
import { 결과화면 } from '../pages/result.page.js';
import { 던전으로 } from './game-enter.helper.js';
import { GM, 우편보내기, GM결과기다리기, 봇시키기, 봇켜기, 봇로그, 봇이본글기다리기, 상태읽기 } from './game-state.helper.js';

export async function 임프하나만두기(game: GameDriver, 종류: 'imp' | 'thrower' | 'boss' = 'imp'): Promise<void> {
  await GM(game, '/gm killall');
  if (!(await 임프수가될때까지(game, '없음'))) throw new Error('/gm killall 뒤 15초가 지나도 임프가 남아 있다');
  await GM(game, `/gm spawn ${종류}`);
  if (!(await 임프수가될때까지(game, '하나'))) throw new Error(`/gm spawn ${종류} 뒤 15초 안에 임프가 하나만 남지 않았다`);
}

async function 임프수가될때까지(game: GameDriver, 수: '없음' | '하나', 시간 = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 시간;
  do {
    const 지금 = await game.find(던전화면.임프).then(
      (찾은것) => (찾은것 === null ? '없음' : '하나'),
      (오류: unknown) => {
        if (오류 instanceof Error && 오류.message.includes('개라')) return '여럿';
        throw 오류;
      },
    );
    if (지금 === 수) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 항아리하나두기(game: GameDriver): Promise<void> {
  await GM(game, '/gm spawn pot');
  await game.waitFor(던전화면.항아리, { timeoutMs: 10_000 });
}

export async function 보스방으로(game: GameDriver): Promise<void> {
  if (!(await GM결과기다리기(game, '/gm tp boss', 'tp boss 도착', 20_000))) throw new Error('「[GM] tp boss 도착」 알림이 20초 안에 오지 않았다');
}

export interface 둘이서 {
  던전: 던전화면;
  봇: string;
}

export async function 둘이서던전으로(
  game: GameDriver,
  admin: APIRequestContext,
  나: { 아이디: string; 비밀번호: string },
  둘째: { 아이디: string; 비밀번호: string },
  카드 = 0,
): Promise<둘이서> {
  const 봇 = await 봇켜기(admin, { user: 둘째.아이디, pass: 둘째.비밀번호 });
  await 봇시키기(admin, 봇, 'seat:2');
  await 봇시키기(admin, 봇, 'ready');
  const 던전 = await 던전으로(game, 나.아이디, 나.비밀번호, 카드);
  return { 던전, 봇 };
}

export function 수치(상태: Record<string, string>, 키: string): number {
  return Number(상태[키]);
}

export function 체력(상태: Record<string, string>): { 지금: number; 최대: number } {
  const 맞음 = /^(\d+)\/(\d+)$/.exec(상태['체력'] ?? '');
  return { 지금: Number(맞음?.[1] ?? 'NaN'), 최대: Number(맞음?.[2] ?? 'NaN') };
}

export function 행동스킬들(상태: Record<string, string>): string[] {
  return (상태['스킬'] ?? '').split(',').map((이름) => 이름.trim());
}

export function 줄값(줄들: string[], 이름: RegExp, 낱말: string): number {
  const 줄 = 줄들.find((글) => 이름.test(글));
  if (줄 === undefined) return Number.NaN;
  const 맞음 = new RegExp(`${낱말}[^0-9-]{0,4}(-?[0-9]+(?:\\.[0-9]+)?)`).exec(줄);
  return Number(맞음?.[1] ?? 'NaN');
}

export async function 머리위숫자글(game: GameDriver, 숫자주소: string, 시간 = 10_000): Promise<string | null> {
  const 떴나 = await game.waitFor(`${숫자주소}/Text`, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
  if (!떴나) return null;
  return await game.text(`${숫자주소}/Text`).catch(() => null);
}

export async function 머리위숫자색(game: GameDriver, 숫자주소: string): Promise<number[]> {
  const 값 = await game.get(`${숫자주소}/Text`, 'TextMeshProUGUI.color');
  return Array.isArray(값) ? (값 as number[]) : [];
}

export async function 공격버튼역할기다려읽기(game: GameDriver, 역할: keyof typeof 던전화면.역할그림, 시간 = 10_000): Promise<string> {
  await game.waitForValue(던전화면.공격, 던전화면.공격버튼그림, 던전화면.역할그림[역할], { timeoutMs: 시간 }).catch(() => undefined);
  return 던전화면.지금(game).공격버튼역할();
}

export async function 주소사라졌나(game: GameDriver, 주소: string, 시간 = 10_000): Promise<boolean> {
  return game.waitFor(주소, { gone: true, timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
}

export async function 내영웅이동속도(game: GameDriver): Promise<number> {
  return Number(await game.get(던전화면.내영웅, 'ServerCharacter.CharacterClass.Speed'));
}

export async function 보이는이름표수(game: GameDriver): Promise<number> {
  return game.find(던전화면.이름표).then(
    (찾은것) => (찾은것 === null ? 0 : 1),
    () => 2,
  );
}

export async function 오른쪽아래인가(game: GameDriver, 주소: string): Promise<boolean> {
  const 찾은것 = await game.find(주소);
  if (찾은것?.rect === undefined || 찾은것.screen === undefined) return false;
  const [x, y, 너비, 높이] = 찾은것.rect;
  return x + 너비 / 2 > 찾은것.screen[0] / 2 && y + 높이 / 2 < 찾은것.screen[1] / 2;
}

export async function 승리결과화면으로(game: GameDriver, 아이디: string, 비밀번호: string): Promise<결과화면> {
  await 던전으로(game, 아이디, 비밀번호);
  await 보스방으로(game);
  await GM(game, '/gm killboss');
  return await 결과화면.열기(game, 40_000);
}

export async function 쓰러진아군을골라부활누르기(game: GameDriver): Promise<void> {
  await game.click(던전화면.아군초상화);
  await game.waitForValue(던전화면.공격, 던전화면.공격버튼그림, 던전화면.역할그림.부활, { timeoutMs: 10_000 });
  await game.click(던전화면.공격);
}

export async function 봇체력이될때까지(admin: APIRequestContext, 봇: string, 체력값: number, 시간 = 30_000): Promise<number | null> {
  const 끝 = Date.now() + 시간;
  let 읽은값: number | null = null;
  do {
    await 봇로그(admin, 봇, true);
    await 봇시키기(admin, 봇, 'gm:stat');
    const 줄 = await 봇이본글기다리기(admin, 봇, '체력=', 5_000);
    const 맞음 = /체력=(\d+)\//.exec(줄 ?? '');
    if (맞음 !== null) 읽은값 = Number(맞음[1]);
  } while (읽은값 !== 체력값 && Date.now() < 끝);
  return 읽은값;
}

export async function 내체력이될때까지(game: GameDriver, 체력값: number, 시간 = 30_000): Promise<number> {
  const 끝 = Date.now() + 시간;
  let 읽은값 = Number.NaN;
  do {
    읽은값 = 체력(await 상태읽기(game, true)).지금;
  } while (읽은값 !== 체력값 && Date.now() < 끝);
  return 읽은값;
}

export interface 화면비율 {
  가로: number;
  세로: number;
}

export async function 화면자리(game: GameDriver, 주소: string): Promise<화면비율> {
  const 찾은것 = await game.find(주소);
  if (찾은것?.x === undefined || 찾은것.y === undefined) throw new Error(`${주소} 의 화면 자리를 읽지 못했다`);
  const [너비, 높이] = 찾은것.screen ?? [2400, 1080];
  return { 가로: 찾은것.x / 너비, 세로: 1 - 찾은것.y / 높이 };
}

export async function 로비영웅카드자리들(game: GameDriver): Promise<화면비율[]> {
  const 자리들: 화면비율[] = [];
  for (let 번호 = 0; 번호 < 8; 번호 += 1) {
    if ((await game.find(로비화면.카드(번호))) === null) break;
    자리들.push(await 화면자리(game, 로비화면.카드(번호)));
  }
  return 자리들;
}

export async function 전체채팅두줄보내기(game: GameDriver, 첫줄: string, 둘째줄: string): Promise<void> {
  const 창 = await 채팅창.열기(game);
  await 창.보내기(첫줄);
  await 창.보내기(둘째줄);
  await 창.닫기누르기();
}

export async function 던전에들어갈때까지(game: GameDriver, 시간 = 30_000): Promise<boolean> {
  return game.waitFor(던전화면.행동막대, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
}

export async function 임프하나만두고레벨맞추기(game: GameDriver, 레벨: number): Promise<void> {
  await 임프하나만두기(game);
  await GM(game, `/gm level ${String(레벨)}`);
}

export async function 장비받아끼기(
  game: GameDriver,
  admin: APIRequestContext,
  아이디: string,
  아이템: string,
  칸: '무기' | '갑옷' | '장신구',
): Promise<string> {
  const 제목 = `[QA] ${아이템} 지급`;
  await 우편보내기(admin, 아이디, { 제목, 아이템: [{ 이름: 아이템, 개수: 1 }] });
  await new 공통HUD(game).알림기다리기('새 우편', 20_000);
  const 우편 = await 우편함창.열기(game);
  const 끝 = Date.now() + 15_000;
  let 받음 = false;
  do {
    for (const 줄 of await 우편.목록.줄경로들()) {
      if (!(await 우편.목록.줄글(줄)).includes(제목)) continue;
      const 버튼 = await 우편.목록.줄버튼(줄, '받기');
      if (버튼 === null) continue;
      await 우편.누르기(버튼);
      받음 = true;
      break;
    }
  } while (!받음 && Date.now() < 끝);
  await 우편.닫기누르기();
  if (!받음) throw new Error(`우편함에서 「${제목}」 줄을 15초 안에 못 찾았다`);
  const 가방 = await 가방창.열기(game);
  if (!(await 가방.장착(아이템))) throw new Error(`가방에서 「${아이템}」 줄의 「장착」을 못 눌렀다`);
  const 장착끝 = Date.now() + 10_000;
  let 글 = '';
  do {
    글 = await 가방.장착칸글(칸);
  } while (!글.includes(아이템) && Date.now() < 장착끝);
  await 가방.닫기누르기();
  return 글;
}

export async function 경험치글이바뀔때까지(game: GameDriver, 이전: string, 처음레벨 = false, 시간 = 10_000): Promise<string> {
  const 끝 = Date.now() + 시간;
  let 글 = '';
  do {
    글 = await new 공통HUD(game).경험치글();
  } while ((글 === '' || (글 === 이전 && !(처음레벨 && 글.startsWith('0/')))) && Date.now() < 끝);
  return 글;
}

export async function 레벨마다경험치글(game: GameDriver, 레벨들: number[]): Promise<string[]> {
  const 창 = await 채팅창.열기(game);
  const 글들: string[] = [];
  try {
    let 이전 = await new 공통HUD(game).경험치글();
    for (const 레벨 of 레벨들) {
      await 창.보내기(`/gm level ${String(레벨)}`);
      이전 = await 경험치글이바뀔때까지(game, 이전, 레벨 === 1);
      글들.push(이전);
    }
  } finally {
    await 창.닫기누르기();
  }
  return 글들;
}

export function 필요량(경험치글: string): string {
  return 경험치글.split('/')[1]?.trim() ?? 경험치글;
}

export function 색이름(색: number[]): string {
  const [r = 0, g = 0, b = 0] = 색;
  if (r > 0.9 && g > 0.9 && b > 0.9) return '흰색';
  if (r > 0.8 && g < 0.35 && b < 0.35) return '빨간색';
  if (g > 0.7 && r < 0.45 && b < 0.45) return '초록색';
  if (r > 0.9 && g > 0.6 && g < 0.95 && b < 0.5) return '금색';
  return `기타 ${색.map((값) => 값.toFixed(2)).join(',')}`;
}

export async function 머리위숫자읽기(game: GameDriver, 숫자주소: string, 시간 = 10_000): Promise<{ 글: string; 색: string } | null> {
  const 떴나 = await game.waitFor(`${숫자주소}/Text`, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
  if (!떴나) return null;
  try {
    const 글 = await game.text(`${숫자주소}/Text`);
    const 색 = await game.get(`${숫자주소}/Text`, 'TextMeshProUGUI.color');
    return { 글: 글만(글), 색: 색이름(Array.isArray(색) ? (색 as number[]) : []) };
  } catch {
    return null;
  }
}

export async function GM하고알림읽기(game: GameDriver, 명령: string, 알림글: string, 시간 = 10_000): Promise<{ 떴나: boolean; 색: string }> {
  const 창 = await 채팅창.열기(game);
  try {
    await 창.보내기(명령);
    const 주소 = `//*[contains(@text,${알림글})]`;
    const 떴나 = await game.waitFor(주소, { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
    if (!떴나) return { 떴나, 색: '' };
    const 찾은것 = await game.find(주소).catch(() => null);
    const 색 = 찾은것 === null ? [] : await game.get(찾은것.path, 'TextMeshProUGUI.color').catch(() => []);
    return { 떴나, 색: 색이름(Array.isArray(색) ? (색 as number[]) : []) };
  } finally {
    await 창.닫기누르기();
  }
}

export function 서버아이템개수(items: Record<string, number>, 이름: string): number {
  return Object.entries(items)
    .filter(([키]) => 키 === 이름 || 키.includes(이름))
    .reduce((합, [, 개수]) => 합 + 개수, 0);
}

export function 서버아이템합(items: Record<string, number>): number {
  return Object.values(items).reduce((합, 개수) => 합 + 개수, 0);
}

export async function 가방화면개수(game: GameDriver, 이름: string): Promise<number> {
  const 창 = await 가방창.열기(game);
  try {
    const 줄 = await 창.목록.이름줄(이름);
    if (줄 === null) return 0;
    const 첫칸 = await 창.목록.칸글(줄, 0);
    return Number(/x\s*(\d+)\s*$/.exec(첫칸)?.[1] ?? '1');
  } finally {
    await 창.닫기누르기();
  }
}

export async function 가방화면줄수(game: GameDriver): Promise<number> {
  const 창 = await 가방창.열기(game);
  try {
    return await 창.목록.줄수();
  } finally {
    await 창.닫기누르기();
  }
}

export async function 가방개수가될때까지(game: GameDriver, 이름: string, 개수: number, 시간 = 15_000): Promise<number> {
  const 끝 = Date.now() + 시간;
  let 지금 = await 가방화면개수(game, 이름);
  while (지금 !== 개수 && Date.now() < 끝) 지금 = await 가방화면개수(game, 이름);
  return 지금;
}

export async function 골드가바뀔때까지(game: GameDriver, 이전: number, 시간 = 15_000): Promise<number> {
  const 읽기 = async (): Promise<number> => Number((await new 공통HUD(game).골드글()).replace(/[^0-9]/g, ''));
  const 끝 = Date.now() + 시간;
  let 지금 = await 읽기();
  while (지금 === 이전 && Date.now() < 끝) 지금 = await 읽기();
  return 지금;
}

export async function 처치수가오를때까지(game: GameDriver, 이전: number, 시간 = 20_000): Promise<Record<string, string>> {
  const 끝 = Date.now() + 시간;
  let 상태 = await 상태읽기(game, true);
  while (Number(상태['처치']) <= 이전 && Date.now() < 끝) 상태 = await 상태읽기(game, true);
  return 상태;
}

export function 데이터조각(줄들: string[], 이름: string, 경계들: string[]): string {
  const 글 = 줄들.join(' ');
  const 처음 = 글.indexOf(이름);
  if (처음 < 0) return '';
  const 끝들 = 경계들.filter((경계) => 경계 !== 이름).map((경계) => 글.indexOf(경계, 처음 + 이름.length)).filter((자리) => 자리 >= 0);
  return 글.slice(처음, 끝들.length === 0 ? undefined : Math.min(...끝들));
}

export function 조각수치들(조각: string, 낱말: string): number[] {
  const 맞음 = new RegExp(`${낱말}[^0-9-]{0,4}((?:-?[0-9]+(?:\\.[0-9]+)?[ /,·~]*)+)`).exec(조각);
  return (맞음?.[1] ?? '').match(/-?[0-9]+(?:\.[0-9]+)?/g)?.map(Number) ?? [];
}

export async function GM하고알림들읽기(game: GameDriver, 명령: string, 알림주소들: string[], 시간 = 10_000): Promise<{ 떴나: boolean; 색: string }[]> {
  const 창 = await 채팅창.열기(game);
  const 결과: { 떴나: boolean; 색: string }[] = [];
  try {
    await 창.보내기(명령);
    for (const 주소 of 알림주소들) {
      const 떴나 = await game.waitFor(주소, { timeoutMs: 시간 }).then(
        () => true,
        () => false,
      );
      const 찾은것 = 떴나 ? await game.find(주소).catch(() => null) : null;
      const 색 = 찾은것 === null ? [] : await game.get(찾은것.path, 'TextMeshProUGUI.color').catch(() => []);
      결과.push({ 떴나, 색: 색이름(Array.isArray(색) ? (색 as number[]) : []) });
    }
  } finally {
    await 창.닫기누르기();
  }
  return 결과;
}

export async function 봇경험치(admin: APIRequestContext, 봇: string): Promise<number> {
  await 봇로그(admin, 봇, true);
  await 봇시키기(admin, 봇, 'gm:stat');
  const 글 = await 봇이본글기다리기(admin, 봇, '경험치=', 20_000);
  const 맞음 = /레벨=(\d+)\s+경험치=(\d+)/.exec(글 ?? '');
  if (맞음 === null) throw new Error(`봇이 본 stat 글에서 레벨 · 경험치를 못 읽었다 — ${글 ?? '없음'}`);
  return Number(맞음[1]) * 1_000_000 + Number(맞음[2]);
}

export async function 봇경험치가오를때까지(admin: APIRequestContext, 봇: string, 이전: number, 시간 = 20_000): Promise<number> {
  const 끝 = Date.now() + 시간;
  let 지금 = await 봇경험치(admin, 봇);
  while (지금 <= 이전 && Date.now() < 끝) 지금 = await 봇경험치(admin, 봇);
  return 지금;
}

export async function 물약개수읽기(game: GameDriver): Promise<number> {
  return Number(/\d+/.exec(await 던전화면.지금(game).물약글읽기())?.[0] ?? 'NaN');
}

export async function 물약개수가될때까지(game: GameDriver, 개수: number, 시간 = 15_000): Promise<number> {
  const 끝 = Date.now() + 시간;
  let 지금 = await 물약개수읽기(game);
  while (지금 !== 개수 && Date.now() < 끝) 지금 = await 물약개수읽기(game);
  return 지금;
}

export function 몬스터줄(줄들: string[], 종류: 'imp' | 'thrower' | 'boss'): string {
  const 맞는것 = {
    imp: /^(?!.*(던지|보스|thrower|boss)).*(임프|imp)/i,
    thrower: /(던지|thrower)/i,
    boss: /(보스|boss)/i,
  }[종류];
  return 줄들.find((줄) => 맞는것.test(줄)) ?? '';
}

export function 낱말모든값(조각: string, 낱말: string): number[][] {
  const 식 = new RegExp(`${낱말}[^0-9-]{0,4}((?:-?[0-9]+(?:\\.[0-9]+)?[ /,·~]*)+)`, 'g');
  return [...조각.matchAll(식)].map((맞음) => (맞음[1] ?? '').match(/-?[0-9]+(?:\.[0-9]+)?/g)?.map(Number) ?? []);
}

export function 첫값(값들: number[][], 번째 = 0): number {
  return 값들[번째]?.[0] ?? Number.NaN;
}

export async function 임프에게맞은피해읽기(game: GameDriver): Promise<number> {
  await 머리위숫자글(game, 던전화면.내피해숫자, 20_000);
  return 수치(await 상태읽기(game, true), '받은피해');
}

export async function 봇과같이던전으로(
  game: GameDriver,
  admin: APIRequestContext,
  나: { 아이디: string; 비밀번호: string },
  둘째: { 아이디: string; 비밀번호: string },
  카드 = 0,
): Promise<둘이서> {
  const 봇 = await 봇켜기(admin, { user: 둘째.아이디, pass: 둘째.비밀번호 });
  const 로비다 = await 봇시키기(admin, 봇, 'seat:2').then(
    () => true,
    (오류: unknown) => {
      if (오류 instanceof Error && 오류.message.includes('로비(영웅 고르기)가 아닙니다')) return false;
      throw 오류;
    },
  );
  if (로비다) await 봇시키기(admin, 봇, 'ready');
  const 던전 = await 던전으로(game, 나.아이디, 나.비밀번호, 카드);
  return { 던전, 봇 };
}
