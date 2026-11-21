import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 길드창 } from '../pages/guild.page.js';
import { 우편함창 } from '../pages/mail.page.js';
import { 퀘스트창 } from '../pages/quest.page.js';
import { 상점창 } from '../pages/shop.page.js';

import { 게임다시켜기, 던전으로, 로비로 } from './game-enter.helper.js';
import { 토스트글들 } from './login-tools.helper.js';
import type { 앱제어 } from './game-enter.helper.js';
import { GM자료, 불러내기, 봇기록, 봇기록기다리기, 봇시키기, 봇줄글, 봇켜기, 적모두처치, 접속끊기, 지급이력, 열린창닫기, 우편보내기, 캐릭터 } from './game-state.helper.js';
import type { 계정 } from './game-state.helper.js';

export interface 보낼우편 {
  제목: string;
  본문?: string;
  아이템?: { 이름: string; 개수: number }[];
  골드?: number;
}

export interface 표줄 {
  이름: string;
  값: Record<string, string>;
}

export async function 서버골드(admin: APIRequestContext, 누구: 계정): Promise<number> {
  return (await 캐릭터(admin, 누구.아이디)).골드;
}

export async function 서버개수(admin: APIRequestContext, 누구: 계정, 이름: string): Promise<number> {
  return (await 캐릭터(admin, 누구.아이디)).아이템[이름] ?? 0;
}

async function 서버값이될때까지(읽기: () => Promise<number>, 기대: number, 한도ms: number): Promise<number> {
  const 끝 = Date.now() + 한도ms;
  let 값 = await 읽기();
  while (값 !== 기대 && Date.now() < 끝) 값 = await 읽기();
  return 값;
}

export async function 서버골드가될때까지(admin: APIRequestContext, 누구: 계정, 기대: number, 한도ms = 20_000): Promise<number> {
  return 서버값이될때까지(() => 서버골드(admin, 누구), 기대, 한도ms);
}

export async function 서버개수가될때까지(admin: APIRequestContext, 누구: 계정, 이름: string, 기대: number, 한도ms = 20_000): Promise<number> {
  return 서버값이될때까지(() => 서버개수(admin, 누구, 이름), 기대, 한도ms);
}

export async function 우편지급(admin: APIRequestContext, 누구: 계정, 우편: 보낼우편): Promise<number> {
  const 값 = await 캐릭터(admin, 누구.아이디);
  return 우편보내기(admin, 값.id, 우편);
}

export function 골드표시(골드: number): string {
  return `${골드.toLocaleString('en-US')} G`;
}

export async function 우편숫자될때까지(game: GameDriver, 개수: number, 한도ms = 45_000): Promise<boolean> {
  return game.waitFor(`${공통HUD.메뉴버튼('우편')}/Text`, { text: `>${String(개수)}<`, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 우편숫자없어질때까지(game: GameDriver, 한도ms = 20_000): Promise<boolean> {
  return game.waitFor(`${공통HUD.메뉴버튼('우편')}/Text[contains(@text,color)]`, { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 우편메뉴원문(game: GameDriver): Promise<string> {
  return game.text(`${공통HUD.메뉴버튼('우편')}/Text`);
}

export async function 우편함줄뜰때까지(game: GameDriver, 줄수: number, 한도ms = 20_000): Promise<boolean> {
  return game.waitFor(우편함창.줄주소(줄수 - 1), { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 우편함비었음뜰때까지(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`${우편함창.줄}//*[contains(@text,받은 우편이 없습니다)]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 우편보내기만(game: GameDriver, admin: APIRequestContext, 누구: 계정, 우편들: 보낼우편[]): Promise<number[]> {
  const 번호들: number[] = [];
  for (const 우편 of 우편들) {
    번호들.push(await 우편지급(admin, 누구, 우편));
    if (!(await 우편숫자될때까지(game, 번호들.length))) {
      throw new Error(`우편 ${String(번호들.length)}통이 메뉴 숫자에 반영되지 않았습니다 — 지급 번호 ${String(번호들.at(-1))}`);
    }
  }
  return 번호들;
}

export async function 우편보내고우편함열기(game: GameDriver, admin: APIRequestContext, 누구: 계정, 우편들: 보낼우편[]): Promise<{ 함: 우편함창; 번호들: number[] }> {
  await 열린창닫기(game);
  const 번호들 = await 우편보내기만(game, admin, 누구, 우편들);
  const 함 = await 우편함창.열기(game);
  if (!(await 우편함줄뜰때까지(game, 우편들.length))) throw new Error(`우편함에 우편 줄 ${String(우편들.length)}개가 뜨지 않았습니다`);
  return { 함, 번호들 };
}

export async function 알림떠있나(game: GameDriver, 글: string): Promise<boolean> {
  return (await game.find(공통HUD.알림(글))) !== null;
}

export async function 알림하나도없나(game: GameDriver): Promise<boolean> {
  return (await game.find(`${공통HUD.알림들}/*/Text`)) === null;
}

export async function 알림사라질때까지(game: GameDriver, 글: string, 한도ms = 15_000): Promise<boolean> {
  if (!(await 알림떠있나(game, 글))) return true;
  return game.waitFor(공통HUD.알림(글), { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 알림글읽기(game: GameDriver, 앞글: string, 한도ms = 10_000): Promise<string | null> {
  const 떴다 = await game.waitFor(공통HUD.알림(앞글), { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
  if (!떴다) return null;
  const 찾음 = await game.find(공통HUD.알림(앞글));
  return 찾음 === null ? null : 색뗀글(찾음.text ?? '');
}

export async function 알림수될때까지(game: GameDriver, 글: string, 수: number, 한도ms = 15_000): Promise<number> {
  const 끝 = Date.now() + 한도ms;
  let 가장많이 = 0;
  do {
    가장많이 = Math.max(가장많이, (await 토스트글들(game)).filter((줄) => 색뗀글(줄).includes(글)).length);
    if (가장많이 >= 수) return 가장많이;
  } while (Date.now() < 끝);
  return 가장많이;
}

export async function 확인창떴나(game: GameDriver, 연창: string): Promise<boolean> {
  if ((await game.find('/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)')) !== null) return true;
  for (const 이름 of 공통HUD.창이름들) {
    if (이름 !== 연창 && (await game.find(`/Showcase HUD/Window ${이름}`)) !== null) return true;
  }
  return false;
}

export async function 가방줄(가방: 가방창, 이름: string): Promise<number> {
  const 번호 = await 가방.줄찾기(이름);
  if (번호 === null) throw new Error(`가방에 ${이름} 줄이 없습니다`);
  return 번호;
}

export async function 상점줄(상점: 상점창, 이름: string): Promise<number> {
  const 번호 = await 상점.줄찾기(이름);
  if (번호 === null) throw new Error(`상점에 ${이름} 줄이 없습니다`);
  return 번호;
}

export async function 퀘스트줄(퀘스트: 퀘스트창, 이름: string): Promise<number> {
  const 번호 = await 퀘스트.줄찾기(이름);
  if (번호 === null) throw new Error(`퀘스트 창에 ${이름} 줄이 없습니다`);
  return 번호;
}

export async function 가방채우기(game: GameDriver, admin: APIRequestContext, 누구: 계정, 아이템들: { 이름: string; 개수: number }[]): Promise<number> {
  const { 함, 번호들 } = await 우편보내고우편함열기(game, admin, 누구, [{ 제목: 'QA 가방 채우기', 아이템: 아이템들 }]);
  await 함.받기(0);
  if (!(await new 공통HUD(game).알림뜸('받음'))) throw new Error('우편 「받기」 뒤 「받음」 알림이 뜨지 않았습니다');
  await 열린창닫기(game);
  return 번호들[0] ?? 0;
}

export async function 장착하기(game: GameDriver, 이름: string): Promise<void> {
  const 가방 = await 가방창.열기(game);
  await 가방.줄버튼누르기(await 가방줄(가방, 이름), '장착');
  if (!(await new 공통HUD(game).알림뜸(`${이름} 장착`))) throw new Error(`${이름} 장착 알림이 뜨지 않았습니다`);
  if (!(await 알림사라질때까지(game, `${이름} 장착`))) throw new Error(`${이름} 장착 알림이 사라지지 않았습니다`);
}

export async function 사기(game: GameDriver, 이름: string): Promise<void> {
  const 상점 = await 상점창.열기(game);
  const 줄 = await 상점줄(상점, 이름);
  await 알림사라질때까지(game, `${이름} 1개 구매`);
  await 상점.구매누르기(줄);
  if (!(await new 공통HUD(game).알림뜸(`${이름} 1개 구매`))) throw new Error(`${이름} 구매 알림이 뜨지 않았습니다`);
}

export async function 팔기(game: GameDriver, 이름: string, 받는골드: number): Promise<void> {
  const hud = new 공통HUD(game);
  const 가방 = await 가방창.열기(game);
  const 줄 = await 가방줄(가방, 이름);
  const 전 = await hud.골드값();
  await 가방.줄버튼누르기(줄, '판매');
  if (!(await hud.골드가될때까지(골드표시(전 + 받는골드)))) throw new Error(`${이름} 판매 뒤 골드가 ${골드표시(전 + 받는골드)} 로 바뀌지 않았습니다`);
}

export async function 체력물약모두팔기(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 3; 번 += 1) await 팔기(game, '체력 물약', 7);
}

export function 글자색(원문: string): string | null {
  const 맞음 = /<color=(#[0-9A-Fa-f]{6})/.exec(원문);
  return 맞음 === null ? null : (맞음[1] ?? '').toUpperCase();
}

export function 색이름(원문: string): string {
  const 색 = 글자색(원문);
  if (색 === null) return '색 없음';
  const r = parseInt(색.slice(1, 3), 16);
  const g = parseInt(색.slice(3, 5), 16);
  const b = parseInt(색.slice(5, 7), 16);
  if (Math.max(r, g, b) - Math.min(r, g, b) <= 40) return '회색';
  if (r > 150 && g < 130 && b < 130) return '빨강';
  if (g > r && g > b) return '초록';
  if (r > 200 && g > 150 && b < 130 && r >= g) return '금색';
  return '그 밖의 색';
}

export function 표줄풀기(글: string): 표줄 {
  const 값: Record<string, string> = {};
  for (const 맞음 of 글.matchAll(/([^\s=]+)=(.*?)(?=\s[^\s=]+=|$)/g)) {
    값[맞음[1] ?? ''] = (맞음[2] ?? '').trim();
  }
  const 첫칸 = /\s?[^\s=]+=/.exec(글);
  const 이름 = 값['이름'] ?? (첫칸 === null ? 글.trim() : 글.slice(0, 첫칸.index).trim());
  return { 이름, 값 };
}

export async function 아이템표읽기(game: GameDriver): Promise<표줄[]> {
  const 줄들 = await GM자료(game, 'item');
  return 줄들.filter((글) => !글.trim().startsWith('끝')).map(표줄풀기);
}

export function 표값글(줄: 표줄 | undefined): string {
  if (줄 === undefined) return '표에 없음';
  const 가격 = (글: string | undefined): string => {
    const 수 = Number((글 ?? '').replace(/[^0-9]/g, ''));
    return 수 > 0 ? String(수) : '없음';
  };
  return `${줄.값['분류'] ?? '?'} · ${줄.값['등급'] ?? '?'} · 상점가 ${가격(줄.값['상점가'])} · 판매가 ${가격(줄.값['판매가'])}`;
}

export async function 화면자리(game: GameDriver, 주소: string): Promise<{ rect: number[]; screen: number[] } | null> {
  const 찾음 = await game.find(주소);
  if (찾음 === null || 찾음.rect === undefined || 찾음.screen === undefined) return null;
  return { rect: 찾음.rect, screen: 찾음.screen };
}

export async function 화면안인가(game: GameDriver, 주소: string): Promise<boolean> {
  const 자리 = await 화면자리(game, 주소);
  if (자리 === null) return false;
  const [x = 0, y = 0, 너비 = 0, 높이 = 0] = 자리.rect;
  const [화면너비 = 0, 화면높이 = 0] = 자리.screen;
  return x >= 0 && y >= 0 && x + 너비 <= 화면너비 && y + 높이 <= 화면높이;
}

export async function 자리바뀜(game: GameDriver, 주소: string, 전: number[] | null): Promise<boolean> {
  const 지금 = await 화면자리(game, 주소);
  if (지금 === null || 전 === null) return false;
  return 지금.rect.join(',') !== 전.join(',');
}

export async function 왼쪽인가(game: GameDriver, 주소: string, 판주소: string): Promise<boolean> {
  const 칸 = await 화면자리(game, 주소);
  const 판 = await 화면자리(game, 판주소);
  if (칸 === null || 판 === null) return false;
  return (칸.rect[0] ?? 0) + (칸.rect[2] ?? 0) / 2 < (판.rect[0] ?? 0) + (판.rect[2] ?? 0) / 2;
}

export async function 오른쪽위인가(game: GameDriver, 주소: string, 판주소: string): Promise<boolean> {
  const 칸 = await 화면자리(game, 주소);
  const 판 = await 화면자리(game, 판주소);
  if (칸 === null || 판 === null) return false;
  const 칸가운데x = (칸.rect[0] ?? 0) + (칸.rect[2] ?? 0) / 2;
  const 칸가운데y = (칸.rect[1] ?? 0) + (칸.rect[3] ?? 0) / 2;
  const 판가운데x = (판.rect[0] ?? 0) + (판.rect[2] ?? 0) / 2;
  const 판가운데y = (판.rect[1] ?? 0) + (판.rect[3] ?? 0) / 2;
  return 칸가운데x > 판가운데x && 칸가운데y > 판가운데y;
}

export async function 왼쪽아래인가(game: GameDriver, 주소: string, 판주소: string): Promise<boolean> {
  const 칸 = await 화면자리(game, 주소);
  const 판 = await 화면자리(game, 판주소);
  if (칸 === null || 판 === null) return false;
  const 칸가운데x = (칸.rect[0] ?? 0) + (칸.rect[2] ?? 0) / 2;
  const 칸가운데y = (칸.rect[1] ?? 0) + (칸.rect[3] ?? 0) / 2;
  const 판가운데x = (판.rect[0] ?? 0) + (판.rect[2] ?? 0) / 2;
  const 판가운데y = (판.rect[1] ?? 0) + (판.rect[3] ?? 0) / 2;
  return 칸가운데x < 판가운데x && 칸가운데y < 판가운데y;
}

export async function 길드생길때까지(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
  return game.waitFor(`${길드창.내용}//*[contains(@text,길드원)][-1]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 길드탈퇴하기(game: GameDriver): Promise<void> {
  if ((await game.find(공통HUD.메뉴)) === null) return;
  const 길드 = await 길드창.열기(game);
  if ((await game.find(길드창.탈퇴버튼)) !== null) {
    await 길드.탈퇴누르기();
    await game.waitFor(길드창.탈퇴버튼, { gone: true, timeoutMs: 10_000 });
  }
  await 열린창닫기(game);
}

export async function 봇알림기다리기(admin: APIRequestContext, 봇: string, 글: string, 한도ms = 20_000): Promise<boolean> {
  return (await 봇기록기다리기(admin, 봇, (줄) => 줄.type === 'toast' && 봇줄글(줄).includes(글), 한도ms)) !== null;
}

export async function 봇에게시키고알림보기(admin: APIRequestContext, 봇: string, 명령: string, 글: string): Promise<boolean> {
  await 봇기록(admin, 봇, true);
  await 봇시키기(admin, 봇, 명령);
  return 봇알림기다리기(admin, 봇, 글);
}

export async function 봇에게갖추기(
  game: GameDriver,
  driver: 앱제어,
  admin: APIRequestContext,
  봇계정: 계정,
  갖출것: { 아이템: { 이름: string; 개수: number }[]; 장착?: string[] },
): Promise<string> {
  await 로비로(game, driver, 봇계정);
  await 가방채우기(game, admin, 봇계정, 갖출것.아이템);
  for (const 이름 of 갖출것.장착 ?? []) await 장착하기(game, 이름);
  await 접속끊기(admin, 봇계정.아이디);
  await 게임다시켜기(game, driver);
  return 봇켜기(admin, 봇계정);
}

export async function 봇과던전으로(game: GameDriver, driver: 앱제어, admin: APIRequestContext, 나: 계정, 봇계정: 계정): Promise<string> {
  const 봇 = await 봇켜기(admin, 봇계정);
  await 로비로(game, driver, 나);
  await 봇시키기(admin, 봇, 'seat:1');
  await 봇시키기(admin, 봇, 'ready');
  await 던전으로(game, driver, 나, 0);
  return 봇;
}

export async function 임프서른마리처치(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 6; 번 += 1) await 불러내기(game, 'imp');
  await 적모두처치(game);
}

export async function 지급상태(admin: APIRequestContext, 지급번호: number, 한도ms = 15_000): Promise<string> {
  const 끝 = Date.now() + 한도ms;
  let 상태 = '이력에 없음';
  do {
    const 기록 = (await 지급이력(admin, 50)).find((줄) => Number(줄['id']) === 지급번호);
    const 우편들 = (기록?.['mails'] ?? []) as { status?: string }[];
    if (기록 !== undefined) 상태 = 우편들.map((우편) => 우편.status ?? '').join(',');
    if (우편들.length > 0 && 우편들.every((우편) => 우편.status === 'TAKEN')) return '받음';
  } while (Date.now() < 끝);
  return 상태;
}
