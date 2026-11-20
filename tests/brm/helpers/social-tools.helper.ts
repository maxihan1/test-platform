import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';
import type { 공통HUD } from '../components/hud.component.js';
import { 초대창 } from '../components/invite.component.js';
import type { 초대종류 } from '../components/invite.component.js';
import { 채팅창 } from '../pages/chat.page.js';
import { 친구파티창 } from '../pages/friend.page.js';
import { 길드창 } from '../pages/guild.page.js';

import { 게임다시켜기, 로비로 } from './game-enter.helper.js';
import type { 앱제어 } from './game-enter.helper.js';
import { 봇기록, 봇기록기다리기, 봇끄기, 봇시키기, 봇줄글, 봇켜기, 접속자 } from './game-state.helper.js';
import type { 계정 } from './game-state.helper.js';

export type 초대갈래 = '친구' | '파티' | '길드';

const 초대명령: Record<초대갈래, { 보내기: string; 수락: string; 거절: string }> = {
  친구: { 보내기: 'friend_add', 수락: 'friend_accept', 거절: 'friend_decline' },
  파티: { 보내기: 'party_invite', 수락: 'party_accept', 거절: 'party_decline' },
  길드: { 보내기: 'guild_invite', 수락: 'guild_accept', 거절: 'guild_decline' },
};

const 초대창이름: Record<초대갈래, 초대종류> = { 친구: '친구 신청', 파티: '파티 초대', 길드: '길드 초대' };

const 알림줄 = '/Showcase HUD/Toasts/*/Text[-1]';

export async function 로비준비(game: GameDriver, driver: 앱제어, 누구: 계정): Promise<void> {
  if ((await game.find('/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)')) !== null) await 게임다시켜기(game, driver);
  await 로비로(game, driver, 누구);
}

export async function 봇들켜기(admin: APIRequestContext, 계정들: 계정[]): Promise<void> {
  await Promise.all(계정들.map((x) => 봇켜기(admin, x)));
}

export async function 로비와봇준비(game: GameDriver, driver: 앱제어, admin: APIRequestContext, 나: 계정, 봇들: 계정[]): Promise<void> {
  await Promise.all([로비준비(game, driver, 나), 봇들켜기(admin, 봇들)]);
}

export async function 접속중인가(admin: APIRequestContext, 아이디: string): Promise<boolean> {
  return (await 접속자(admin)).players.some((x) => x.user === 아이디);
}

export async function 접속이사라질때까지(admin: APIRequestContext, 아이디: string, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if (!(await 접속중인가(admin, 아이디))) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 봇이받음(admin: APIRequestContext, 봇: string, 종류: 'chat' | 'toast' | 'invite', 글: string, 한도ms = 15_000): Promise<boolean> {
  const 줄 = await 봇기록기다리기(admin, 봇, (x) => x.type === 종류 && 봇줄글(x).includes(글), 한도ms);
  return 줄 !== null;
}

export async function 봇간초대(admin: APIRequestContext, 주는: 계정, 받는: 계정, 갈래: 초대갈래): Promise<void> {
  const 명령 = 초대명령[갈래];
  await 봇기록(admin, 받는.아이디, true);
  await 봇기록(admin, 주는.아이디, true);
  await 봇시키기(admin, 주는.아이디, `${명령.보내기}:${받는.아이디}`);
  if (!(await 봇이받음(admin, 받는.아이디, 'invite', 주는.아이디))) {
    throw new Error(`${주는.아이디} 의 ${갈래} 초대가 ${받는.아이디} 에게 가지 않았습니다`);
  }
  await 봇시키기(admin, 받는.아이디, `${명령.수락}:${주는.아이디}`);
  const 끝알림 = 갈래 === '친구' ? { 누가: 받는.아이디, 글: '친구가 되었습니다' } : { 누가: 주는.아이디, 글: '들어왔습니다' };
  if (!(await 봇이받음(admin, 끝알림.누가, 'toast', 끝알림.글))) {
    throw new Error(`${받는.아이디} 가 ${주는.아이디} 의 ${갈래} 초대를 수락했지만 「${끝알림.글}」 알림이 오지 않았습니다`);
  }
}

export async function 친구미리맺기(admin: APIRequestContext, 나: 계정, 친구들: { 계정: 계정; 오프라인?: boolean }[]): Promise<boolean> {
  await 봇들켜기(admin, [나, ...친구들.map((x) => x.계정)]);
  for (const 친구 of 친구들) await 봇간초대(admin, 친구.계정, 나, '친구');
  const 끌사람 = [나, ...친구들.filter((x) => x.오프라인 === true).map((x) => x.계정)];
  for (const 대상 of 끌사람) await 봇끄기(admin, 대상.아이디);
  for (const 대상 of 끌사람) {
    if (!(await 접속이사라질때까지(admin, 대상.아이디))) throw new Error(`${대상.아이디} 의 봇 접속이 끊기지 않았습니다`);
  }
  return true;
}

export async function 봇길드만들기(admin: APIRequestContext, 봇: 계정, 이름: string): Promise<boolean> {
  await 봇기록(admin, 봇.아이디, true);
  await 봇시키기(admin, 봇.아이디, 'gm:gold 600');
  await 봇이받음(admin, 봇.아이디, 'toast', 'gold 600', 8_000);
  await 봇시키기(admin, 봇.아이디, `guild_create:${이름}`);
  return 봇이받음(admin, 봇.아이디, 'toast', '길드 창설 완료');
}

export interface 길드구성 {
  장: 계정;
  이름: string;
  들어옴: 계정[];
  끌사람?: 계정[];
}

export async function 길드미리만들기(admin: APIRequestContext, 나: 계정, 구성: 길드구성): Promise<boolean> {
  const 모두 = [구성.장, ...구성.들어옴];
  await 봇들켜기(admin, 모두);
  if (!(await 봇길드만들기(admin, 구성.장, 구성.이름))) throw new Error(`${구성.장.아이디} 가 길드 「${구성.이름}」을 만들지 못했습니다`);
  for (const 멤버 of 구성.들어옴) await 봇간초대(admin, 구성.장, 멤버, '길드');
  const 끌사람 = [...(구성.끌사람 ?? [])];
  if (모두.some((x) => x.아이디 === 나.아이디)) 끌사람.push(나);
  for (const 대상 of 끌사람) await 봇끄기(admin, 대상.아이디);
  for (const 대상 of 끌사람) {
    if (!(await 접속이사라질때까지(admin, 대상.아이디))) throw new Error(`${대상.아이디} 의 봇 접속이 끊기지 않았습니다`);
  }
  return true;
}

export async function 받은초대처리(game: GameDriver, 갈래: 초대갈래, 응답: '수락' | '거절'): Promise<void> {
  const 창 = new 초대창(game);
  const 종류 = 초대창이름[갈래];
  if (!(await 창.뜰때까지(종류, 20_000))) throw new Error(`「${종류}」 창이 뜨지 않았습니다`);
  if (응답 === '수락') await 창.수락(종류);
  else await 창.거절(종류);
  if (!(await 창.닫힐때까지(종류))) throw new Error(`「${종류}」 창의 「${응답}」을 눌렀지만 창이 닫히지 않았습니다`);
}

export async function 봇이초대해맺기(game: GameDriver, admin: APIRequestContext, 봇: 계정, 나: 계정, 갈래: '파티' | '길드'): Promise<void> {
  await 봇시키기(admin, 봇.아이디, `${초대명령[갈래].보내기}:${나.아이디}`);
  await 받은초대처리(game, 갈래, '수락');
}

export async function 봇장파티만들기(game: GameDriver, admin: APIRequestContext, 나: 계정, 장: 계정, 이어들어옴: 계정[]): Promise<boolean> {
  await 봇이초대해맺기(game, admin, 장, 나, '파티');
  for (const 봇 of 이어들어옴) await 봇간초대(admin, 장, 봇, '파티');
  const 창 = await 친구파티창.열기(game);
  return 창.파티머리가될때까지(`파티 ${String(2 + 이어들어옴.length)}/4`, 15_000);
}

export async function 파티초대하기(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: 계정, 응답: '수락' | '거절' = '수락'): Promise<void> {
  await 봇기록(admin, 봇.아이디, true);
  const 창 = await 친구파티창.열기(game);
  await 창.이름넣기(봇.아이디);
  await 창.파티초대누르기();
  if (!(await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디))) throw new Error(`${나.아이디} 의 파티 초대가 ${봇.아이디} 에게 가지 않았습니다`);
  await 봇시키기(admin, 봇.아이디, `${응답 === '수락' ? 초대명령.파티.수락 : 초대명령.파티.거절}:${나.아이디}`);
}

export async function 파티에초대해맺기(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: 계정, 인원머리 = '파티 2/4'): Promise<boolean> {
  await 파티초대하기(game, admin, 나, 봇);
  return new 친구파티창(game).파티머리가될때까지(인원머리, 15_000);
}

export async function 친구신청하기(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: 계정, 응답: '수락' | '거절'): Promise<void> {
  await 봇기록(admin, 봇.아이디, true);
  const 창 = await 친구파티창.열기(game);
  await 창.이름넣기(봇.아이디);
  await 창.친구신청누르기();
  if (!(await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디))) throw new Error(`${나.아이디} 의 친구 신청이 ${봇.아이디} 에게 가지 않았습니다`);
  await 봇시키기(admin, 봇.아이디, `${응답 === '수락' ? 초대명령.친구.수락 : 초대명령.친구.거절}:${나.아이디}`);
}

export async function 길드초대하기(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: 계정, 응답: '수락' | '거절' = '수락'): Promise<void> {
  await 봇기록(admin, 봇.아이디, true);
  const 창 = await 길드창.열기(game);
  await 창.초대하기(봇.아이디);
  if (!(await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디))) throw new Error(`${나.아이디} 의 길드 초대가 ${봇.아이디} 에게 가지 않았습니다`);
  await 봇시키기(admin, 봇.아이디, `${응답 === '수락' ? 초대명령.길드.수락 : 초대명령.길드.거절}:${나.아이디}`);
}

export async function 내길드를떠나봇길드원으로(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: 계정, 이름: string): Promise<boolean> {
  const 창 = await 길드창.열기(game);
  await 창.탈퇴누르기();
  if (!(await 창.글줄뜸('아직 길드가 없습니다'))) throw new Error('「길드 탈퇴」를 눌렀지만 길드 없음 안내가 뜨지 않았습니다');
  if (!(await 봇길드만들기(admin, 봇, 이름))) throw new Error(`${봇.아이디} 가 길드 「${이름}」을 만들지 못했습니다`);
  await 봇이초대해맺기(game, admin, 봇, 나, '길드');
  const 다시 = await 길드창.열기(game);
  return 다시.머리가될때까지('길드원 2명', 15_000);
}

export async function 채팅금지될때까지(채팅: 채팅창, 글: string, 한도ms = 20_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    await 채팅.보내기(글);
    if (await 채팅.hud.알림뜸('채팅이 금지된 계정입니다', 1_500)) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 채팅풀릴때까지(채팅: 채팅창, 글: string, 한도ms = 20_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    await 채팅.보내기(글);
    if (await 채팅.글줄뜸(글, 1_500)) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 알림이뜨나(game: GameDriver, 한도ms = 2_000): Promise<boolean> {
  return game.waitFor(알림줄, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 알림이모두사라질때까지(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(알림줄, { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 안내창있나(game: GameDriver): Promise<boolean> {
  return (await game.find('/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)')) !== null;
}

export async function 초대버튼글(game: GameDriver, 종류: 초대종류, 버튼: '수락' | '거절'): Promise<string> {
  return 색뗀글(await game.text(`${초대창.판(종류)}/Button ${버튼}/Text`));
}

export async function 초대안내가될때까지(game: GameDriver, 종류: 초대종류, 글: string, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`${초대창.판(종류)}/Label/Text`, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 초대창하나뿐인가(game: GameDriver, 종류: 초대종류): Promise<boolean> {
  const 판 = 초대창.판(종류);
  return (await game.find(`${판}[-1]`)) !== null && (await game.find(`${판}[1]`)) === null;
}

export async function 초대창이가운데인가(game: GameDriver, 종류: 초대종류): Promise<boolean> {
  const 찾음 = await game.find(초대창.판(종류));
  if (찾음?.rect === undefined || 찾음.screen === undefined) return false;
  const [x, y, 폭, 높이] = 찾음.rect;
  const [화면폭, 화면높이] = 찾음.screen;
  return Math.abs(x + 폭 / 2 - 화면폭 / 2) <= 화면폭 * 0.05 && Math.abs(y + 높이 / 2 - 화면높이 / 2) <= 화면높이 * 0.05;
}

export async function 가림막이화면을덮나(game: GameDriver): Promise<boolean> {
  const 찾음 = await game.find(초대창.가림막);
  if (찾음?.rect === undefined || 찾음.screen === undefined) return false;
  const [x, y, 폭, 높이] = 찾음.rect;
  const [화면폭, 화면높이] = 찾음.screen;
  return x <= 0 && y <= 0 && x + 폭 >= 화면폭 && y + 높이 >= 화면높이;
}

export async function 가림막이어두운가(game: GameDriver): Promise<boolean> {
  const 수 = JSON.stringify(await game.get(초대창.가림막, 'Image.color')).match(/-?\d*\.?\d+/g) ?? [];
  return Number(수[3] ?? '0') > 0;
}

export function 글자색(원문: string | null): string | null {
  if (원문 === null) return null;
  return /<color=(#[0-9A-Fa-f]{6})/.exec(원문)?.[1]?.toUpperCase() ?? null;
}

export function 표시색(원문: string | null, 표시: string): string | null {
  if (원문 === null) return null;
  const 맞음 = new RegExp(`<color=(#[0-9A-Fa-f]{6})>${표시.replace(/[[\]\\^$.*+?()|{}]/g, '\\$&')}`).exec(원문);
  return 맞음?.[1]?.toUpperCase() ?? null;
}

const 채널값 = (색: string | null): [number, number, number] | null =>
  색 === null ? null : [parseInt(색.slice(1, 3), 16), parseInt(색.slice(3, 5), 16), parseInt(색.slice(5, 7), 16)];

export function 초록인가(색: string | null): boolean {
  const 값 = 채널값(색);
  return 값 !== null && 값[1] > 값[0] + 20 && 값[1] > 값[2] + 20;
}

export function 회색인가(색: string | null): boolean {
  const 값 = 채널값(색);
  return 값 !== null && Math.max(...값) - Math.min(...값) <= 40;
}

export function 금색인가(색: string | null): boolean {
  const 값 = 채널값(색);
  return 값 !== null && 값[0] >= 200 && 값[1] >= 150 && 값[2] <= 100;
}

export const 태그뗀글 = (원문: string | null): string | null => (원문 === null ? null : 원문.replace(/<[^>]+>/g, ''));

export async function 골드가값이될때까지(hud: 공통HUD, 값: number, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await hud.골드값()) === 값) return true;
  } while (Date.now() < 끝);
  return false;
}
