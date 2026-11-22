import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 알림띠 } from '../components/toast.component.js';
import { 공통HUD } from '../components/hud.component.js';
import { 길드창 } from '../pages/guild.page.js';
import { 친구파티창 } from '../pages/friends.page.js';
import { 초대창 } from '../pages/invite.page.js';
import { 로그인하기 } from './game-enter.helper.js';
import { 계정되돌리기, 봇기록, 봇모두끄기, 봇시키기, 줄글 } from './game-state.helper.js';
import { GM골드, 색글떼기 } from './gm.helper.js';

export interface 계정 {
  아이디: string;
  비밀번호: string;
}

export type 초대종류 = 'friend' | 'party' | 'guild';
export type 봇줄종류 = 'chat' | 'toast' | 'invite';

export async function 소셜정리(admin: APIRequestContext, 계정들: 계정[]): Promise<void> {
  await 봇모두끄기(admin);
  for (const { 아이디, 비밀번호 } of 계정들) await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
}

export async function 초대수(admin: APIRequestContext, 봇: string, 종류: 초대종류): Promise<number> {
  const 줄들 = await 봇기록(admin, 봇);
  return 줄들.filter((줄) => 줄.type === 'invite' && String(줄.data['Kind'] ?? '').toLowerCase() === 종류).length;
}

export async function 초대가올때까지(admin: APIRequestContext, 봇: string, 종류: 초대종류, 개수 = 1, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 초대수(admin, 봇, 종류)) >= 개수) return true;
    if (Date.now() > 끝) return false;
    await admin.get('/test/state');
  }
}

export async function 봇줄수(admin: APIRequestContext, 봇: string, 종류: 봇줄종류, 조각: string): Promise<number> {
  return (await 봇기록(admin, 봇)).filter((줄) => 줄.type === 종류 && 줄글(줄).includes(조각)).length;
}

export async function 봇줄기다리기(admin: APIRequestContext, 봇: string, 종류: 봇줄종류, 조각: string, 개수 = 1, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 봇줄수(admin, 봇, 종류, 조각)) >= 개수) return true;
    if (Date.now() > 끝) return false;
    await admin.get('/test/state');
  }
}

export async function 봇오류알림수(admin: APIRequestContext, 봇: string): Promise<number> {
  return (await 봇기록(admin, 봇)).filter((줄) => 줄.type === 'toast' && String(줄.data['Error']).toLowerCase() === 'true').length;
}

export async function 알림글(game: GameDriver, 조각: string, 한도ms = 10_000): Promise<string | null> {
  const 띠 = new 알림띠(game);
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 맞은 = (await 띠.글들()).find((글) => 글.includes(조각));
    if (맞은 !== undefined) return 맞은;
    if (Date.now() > 끝) return null;
  }
}

export async function 알림이비기를기다리기(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
  const 띠 = new 알림띠(game);
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 띠.글들()).length === 0) return true;
    if (Date.now() > 끝) return false;
  }
}

export async function 안뜨는지지켜보기(떴나: () => Promise<boolean>, 한도ms = 3_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if (await 떴나()) return false;
    if (Date.now() > 끝) return true;
  }
}

export async function 다시접속하기(game: GameDriver, 아이디: string, 비밀번호: string): Promise<boolean> {
  await game.restart();
  return (await 로그인하기(game, 아이디, 비밀번호)) !== null;
}

export async function 친구맺기(admin: APIRequestContext, 창: 친구파티창, 봇: string, 내이름: string, 친구수: number): Promise<boolean> {
  const 전 = await 초대수(admin, 봇, 'friend');
  await 창.친구신청(봇);
  if (!(await 초대가올때까지(admin, 봇, 'friend', 전 + 1))) return false;
  await 봇시키기(admin, 봇, `friend_accept:${내이름}`);
  return 창.친구머리줄기다리기(친구수);
}

export async function 파티맺기(admin: APIRequestContext, 창: 친구파티창, 봇: string, 내이름: string, 인원: number): Promise<boolean> {
  const 전 = await 초대수(admin, 봇, 'party');
  await 창.파티초대(봇);
  if (!(await 초대가올때까지(admin, 봇, 'party', 전 + 1))) return false;
  await 봇시키기(admin, 봇, `party_accept:${내이름}`);
  return 창.머리줄기다리기(`파티 ${String(인원)}/4`);
}

export async function 봇파티맺기(admin: APIRequestContext, 초대한봇: string, 받는봇: string): Promise<boolean> {
  const 전 = await 초대수(admin, 받는봇, 'party');
  await 봇시키기(admin, 초대한봇, `party_invite:${받는봇}`);
  if (!(await 초대가올때까지(admin, 받는봇, 'party', 전 + 1))) return false;
  await 봇시키기(admin, 받는봇, `party_accept:${초대한봇}`);
  return 봇줄기다리기(admin, 초대한봇, 'toast', '님이 파티에 들어왔습니다');
}

export async function 봇이초대하기(admin: APIRequestContext, 종류: 초대종류, 초대한봇: string, 받는이: string): Promise<void> {
  await 봇시키기(admin, 초대한봇, `${종류}_${종류 === 'friend' ? 'add' : 'invite'}:${받는이}`);
}

export function 만든이름(길이: number): string {
  return `Q${'1'.repeat(Math.max(0, 길이 - 1))}`.slice(0, 길이);
}

export async function 봇이받은글(admin: APIRequestContext, 봇: string, 조각: string, 한도ms = 15_000): Promise<string | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 맞은 = (await 봇기록(admin, 봇)).find((줄) => 줄.type === 'chat' && String(줄.data['Text'] ?? '').includes(조각));
    if (맞은 !== undefined) return String(맞은.data['Text'] ?? '');
    if (Date.now() > 끝) return null;
    await admin.get('/test/state');
  }
}

export async function 봇이받은빈줄수(admin: APIRequestContext, 봇: string): Promise<number> {
  return (await 봇기록(admin, 봇)).filter((줄) => 줄.type === 'chat' && 줄.data['Channel'] !== '시스템' && String(줄.data['Text'] ?? '').trim() === '').length;
}

export async function 봇오류알림기다리기(admin: APIRequestContext, 봇: string, 개수 = 1, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 봇오류알림수(admin, 봇)) >= 개수) return true;
    if (Date.now() > 끝) return false;
    await admin.get('/test/state');
  }
}

export function 채팅줄꼴인가(줄: string, 채널: string, 이름: string, 글: string): boolean {
  const 맨 = 색글떼기(줄);
  const 머리 = `[${채널}]`;
  if (!맨.startsWith(머리)) return false;
  const 나머지 = 맨.slice(머리.length).trim();
  if (!나머지.startsWith(이름)) return false;
  const 뒤 = 나머지.slice(이름.length).trim();
  return 뒤.startsWith(':') && 뒤.slice(1).trim() === 글;
}

export function 줄머리색(줄: string): string | null {
  return /<color=#([0-9a-fA-F]{6})/.exec(줄)?.[1]?.toUpperCase() ?? null;
}

export function 기호앞색(줄: string, 기호: string): number[] | null {
  const 자리 = 줄.indexOf(기호);
  if (자리 < 0) return null;
  const 맞음 = /<color=#([0-9a-fA-F]{6})[^>]*>\s*$/.exec(줄.slice(0, 자리));
  return 맞음?.[1] === undefined ? null : 색채널(맞음[1]);
}

export function 금색인가(색: number[] | null): boolean {
  if (색 === null) return false;
  const [r = 0, g = 0, b = 0] = 색;
  return r > 200 && g > 150 && b < 120;
}

export function 파티원줄(줄들: string[], 이름: string): string | null {
  const 끝 = 줄들.findIndex((줄) => /^친구 \d+명$/.test(색글떼기(줄)));
  const 파티쪽 = 끝 < 0 ? 줄들 : 줄들.slice(0, 끝);
  return 파티쪽.find((줄, i) => i > 0 && 색글떼기(줄).includes(이름)) ?? null;
}

export function 친구줄수(창: 친구파티창, 줄들: string[], 이름: string): number {
  const 머리 = 창.친구머리번호(줄들);
  return 줄들.filter((줄, i) => i > 머리 && 색글떼기(줄).includes(이름)).length;
}

export async function 친구창다시열기(game: GameDriver): Promise<친구파티창> {
  if (await 친구파티창.열려있나(game)) await (await 친구파티창.열기(game)).닫기();
  return 친구파티창.열기(game);
}

export async function 길드창다시열기(game: GameDriver): Promise<길드창> {
  if (await 길드창.열려있나(game)) await (await 길드창.열기(game)).닫기();
  return 길드창.열기(game);
}

export async function 길드세우기(game: GameDriver, 이름: string, 골드 = 5000): Promise<길드창 | null> {
  const 창 = await 골드를맞추고길드창열기(game, 골드);
  await 창.만들기(이름);
  return (await 창.길드머리기다리기('길드원 1명')) === null ? null : 창;
}

export async function 길드원으로들어가기(admin: APIRequestContext, game: GameDriver, 길드장봇: string, 내이름: string): Promise<boolean> {
  await 봇시키기(admin, 길드장봇, `guild_invite:${내이름}`);
  const 초대 = await 초대창.뜰때까지(game, 15_000);
  if (초대 === null) return false;
  await 초대.수락누르기();
  const 창 = await 길드창다시열기(game);
  return (await 창.길드머리기다리기('길드원')) !== null;
}

export async function 초대글기다리기(초대: 초대창, 조각: string, 이름: string, 한도ms = 10_000): Promise<string | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 글 = await 초대.글(조각);
    if (글 !== null && 글.includes(이름)) return 글;
    if (Date.now() > 끝) return null;
  }
}

export async function 길드맞이하기(admin: APIRequestContext, 창: 길드창, 봇: string, 내이름: string, 길드원수: number): Promise<boolean> {
  const 전 = await 초대수(admin, 봇, 'guild');
  await 창.초대하기(봇);
  if (!(await 초대가올때까지(admin, 봇, 'guild', 전 + 1))) return false;
  await 봇시키기(admin, 봇, `guild_accept:${내이름}`);
  return (await 창.길드머리기다리기(`길드원 ${String(길드원수)}명`)) !== null;
}

export async function 봇길드만들기(admin: APIRequestContext, 봇: string, 길드이름: string): Promise<boolean> {
  await 봇시키기(admin, 봇, 'gm:gold 5000');
  if (!(await 봇줄기다리기(admin, 봇, 'toast', '[GM] gold 5000'))) return false;
  await 봇시키기(admin, 봇, `guild_create:${길드이름}`);
  return 봇줄기다리기(admin, 봇, 'toast', '길드 창설 완료');
}

export async function 봇을길드로맞이하기(admin: APIRequestContext, 길드장봇: string, 받는봇: string): Promise<boolean> {
  const 전 = await 초대수(admin, 받는봇, 'guild');
  await 봇시키기(admin, 길드장봇, `guild_invite:${받는봇}`);
  if (!(await 초대가올때까지(admin, 받는봇, 'guild', 전 + 1))) return false;
  await 봇시키기(admin, 받는봇, `guild_accept:${길드장봇}`);
  return 봇줄기다리기(admin, 길드장봇, 'toast', '님이 길드에 들어왔습니다');
}

export async function 골드를맞추고길드창열기(game: GameDriver, 골드: number): Promise<길드창> {
  await GM골드(game, 골드);
  return 길드창.열기(game);
}

function 색채널(hex: string): number[] {
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

export function 점색(줄: string): number[] | null {
  const 맞음 = /<color=#([0-9a-fA-F]{6})[^>]*>\s*●/.exec(줄);
  return 맞음?.[1] === undefined ? null : 색채널(맞음[1]);
}

export function 초록점인가(줄: string): boolean {
  const 색 = 점색(줄);
  if (색 === null) return false;
  const [r = 0, g = 0, b = 0] = 색;
  return g > r + 30 && g > b + 30;
}

export function 회색점인가(줄: string): boolean {
  const 색 = 점색(줄);
  if (색 === null) return false;
  return Math.max(...색) - Math.min(...색) < 40;
}

const 가방창뿌리 = '/Showcase HUD/Window 가방';
const 우편함창뿌리 = '/Showcase HUD/Window 우편함';

async function 창열렸나(game: GameDriver, 뿌리: string): Promise<boolean> {
  return (await game.find(뿌리)) !== null;
}

export async function 가방창열기(game: GameDriver): Promise<void> {
  await new 공통HUD(game).메뉴누르기('가방');
  await game.waitFor(가방창뿌리, { timeoutMs: 10_000 });
}

export async function 가방창열렸나(game: GameDriver): Promise<boolean> {
  return 창열렸나(game, 가방창뿌리);
}

export async function 우편함창열기(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
  await new 공통HUD(game).메뉴누르기('우편');
  return game.waitFor(우편함창뿌리, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 우편함창닫기(game: GameDriver): Promise<void> {
  await game.click(`${우편함창뿌리}/Panel 우편함/Button 닫기`);
  await game.waitFor(우편함창뿌리, { gone: true, timeoutMs: 10_000 });
}
