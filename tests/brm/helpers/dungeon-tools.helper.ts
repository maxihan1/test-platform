import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 친구파티창 } from '../pages/friend.page.js';
import { 던전화면 } from '../pages/dungeon.page.js';
import { 우편함창 } from '../pages/mail.page.js';
import { 퀘스트창 } from '../pages/quest.page.js';
import { 상점창 } from '../pages/shop.page.js';
import { 로비로, 자리고르기, 조작안내닫기 } from './game-enter.helper.js';
import type { 앱제어 } from './game-enter.helper.js';
import { GM값풀기, 불러내기, 봇기록, 봇기록기다리기, 봇시키기, 봇줄글, 봇켜기, 적모두처치 } from './game-state.helper.js';
import type { 계정 } from './game-state.helper.js';

const 채팅창 = '/Showcase HUD/Window 채팅';
const 채팅줄 = `${채팅창}/Panel 채팅/Scroll/Content/Row`;

export interface 함께하는봇 {
  계정: 계정;
  자리: number;
}

export interface 떠오른글 {
  글: string;
  색: string;
}

export const 경과초 = (시작: number): number => (Date.now() - 시작) / 1000;

async function 될때까지(조건: () => Promise<boolean>, 한도ms: number): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if (await 조건()) return true;
  } while (Date.now() < 끝);
  return false;
}

async function 찾을때까지<T>(찾기: () => Promise<T | null>, 한도ms: number): Promise<T | null> {
  const 끝 = Date.now() + 한도ms;
  do {
    const 값 = await 찾기();
    if (값 !== null) return 값;
  } while (Date.now() < 끝);
  return null;
}

export const 한줄로 = (글: string): string => 글.replace(/\s+/g, ' ').trim();

export function 레벨값(상단바글: string): number | null {
  const 맞음 = /^Lv\.?\s*(\d+)/.exec(상단바글.trim());
  return 맞음 === null ? null : Number(맞음[1]);
}

export const 스킬목록 = (상태: Record<string, string>): string[] => (상태['스킬'] ?? '').split(',').map((x) => x.trim());

export const 체력앞수 = (체력글: string | undefined): number => Number((체력글 ?? '').split('/')[0]);

export function 색이름(값: unknown): string {
  let 칸: number[] | null = null;
  if (typeof 값 === 'string') {
    const 해시 = /#([0-9a-f]{6})/i.exec(값);
    if (해시 !== null) {
      const 수 = parseInt(해시[1] ?? '000000', 16);
      칸 = [(수 >> 16) & 255, (수 >> 8) & 255, 수 & 255];
    } else {
      칸 = (값.match(/-?\d+(?:\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    }
  } else if (Array.isArray(값)) {
    칸 = 값.slice(0, 3).map(Number);
  } else if (typeof 값 === 'object' && 값 !== null) {
    const 객체 = 값 as Record<string, unknown>;
    칸 = [Number(객체['r']), Number(객체['g']), Number(객체['b'])];
  }
  if (칸 === null || 칸.length < 3 || 칸.some((x) => Number.isNaN(x))) return '모름';
  const 큰값 = Math.max(...칸);
  const [r, g, b] = (큰값 > 1 ? 칸.map((x) => x / 255) : 칸) as [number, number, number];
  if (Math.min(r, g, b) >= 0.8) return '흰색';
  if (r >= 0.6 && g <= 0.4 && b <= 0.4) return '빨강';
  if (g >= 0.5 && r <= 0.5 && b <= 0.5) return '초록';
  if (r >= 0.8 && g >= 0.6 && g <= 0.95 && b <= 0.5) return '금색';
  return '기타';
}

async function 채팅열려있게(game: GameDriver): Promise<void> {
  if ((await game.find(채팅창)) === null) {
    for (const 이름 of ['가방', '상점', '일일 퀘스트', '우편함', '친구 · 파티', '길드']) {
      if ((await game.find(`/Showcase HUD/Window ${이름}`)) !== null) {
        await game.click(`/Showcase HUD/Window ${이름}/Panel ${이름}/Button 닫기`);
        await game.waitFor(`/Showcase HUD/Window ${이름}`, { gone: true, timeoutMs: 5_000 });
      }
    }
    await game.click('ChatStrip');
    await game.waitFor(`${채팅창}/Panel 채팅/Button 보내기`, { timeoutMs: 10_000 });
  }
  await game.click(`${채팅창}/Panel 채팅/Button 전체`);
}

export async function 채팅열기(game: GameDriver): Promise<void> {
  await 채팅열려있게(game);
}

export async function 채팅보내기(game: GameDriver, 명령: string): Promise<number> {
  await game.type('Input 메시지 입력 (100자)', 명령);
  await game.click(`${채팅창}/Panel 채팅/Button 보내기`);
  return Date.now();
}

export async function 보내고시각재기(game: GameDriver, 명령: string): Promise<number> {
  await 채팅열려있게(game);
  return 채팅보내기(game, 명령);
}

async function 끝줄번호(game: GameDriver): Promise<number> {
  const 끝 = await game.find(`${채팅줄}[-1]/Text`);
  if (끝 === null) return -1;
  const 맞음 = /Row(?:\[(\d+)\])?\/Text$/.exec(끝.path);
  return 맞음 === null ? -1 : Number(맞음[1] ?? '0');
}

async function 줄글(game: GameDriver, 번호: number): Promise<string | null> {
  const 줄 = await game.find(`${채팅줄}[${String(번호)}]/Text`);
  return 줄 === null ? null : 색뗀글(줄.text ?? '');
}

export async function 레벨별수치(game: GameDriver, 레벨: number): Promise<Record<string, string>> {
  await 채팅열려있게(game);
  await 채팅보내기(game, `/gm level ${String(레벨)}`);
  await 채팅보내기(game, '/gm stat');
  const 끝 = Date.now() + 25_000;
  do {
    const 번호 = await 끝줄번호(game);
    if (번호 > 0) {
      const 둘째 = await 줄글(game, 번호);
      const 첫째 = await 줄글(game, 번호 - 1);
      if (둘째 !== null && 첫째 !== null && 둘째.includes('처치=') && 첫째.includes(`레벨=${String(레벨)} `)) return GM값풀기([첫째]);
    }
  } while (Date.now() < 끝);
  throw new Error(`레벨 ${String(레벨)} 로 맞춘 뒤 「/gm stat」 첫 줄을 25초 안에 읽지 못했습니다`);
}

export async function 함께던전으로(game: GameDriver, driver: 앱제어, admin: APIRequestContext, 나: 계정, 봇들: 함께하는봇[], 내자리 = 0): Promise<string[]> {
  await 로비로(game, driver, 나);
  const 이름들: string[] = [];
  for (const 봇 of 봇들) {
    const 이름 = await 봇켜기(admin, 봇.계정);
    await 봇시키기(admin, 이름, `seat:${String(봇.자리)}`);
    await 봇시키기(admin, 이름, 'ready');
    이름들.push(이름);
  }
  await 자리고르기(game, 내자리);
  await game.click('Ready Btn');
  await game.waitFor(던전화면.조작안내확인, { timeoutMs: 90_000 });
  await 조작안내닫기(game);
  return 이름들;
}

export async function 봇과함께던전으로(game: GameDriver, driver: 앱제어, admin: APIRequestContext, 나: 계정, 봇계정: 계정, 내자리 = 0, 봇자리 = 2): Promise<string> {
  const 이름들 = await 함께던전으로(game, driver, admin, 나, [{ 계정: 봇계정, 자리: 봇자리 }], 내자리);
  return 이름들[0] ?? 봇계정.아이디;
}

export async function 조작안내까지(game: GameDriver, driver: 앱제어, 나: 계정, 자리 = 0): Promise<void> {
  await 로비로(game, driver, 나);
  await 자리고르기(game, 자리);
  await game.click('Ready Btn');
  await game.waitFor(던전화면.조작안내확인, { timeoutMs: 90_000 });
}

export async function 임프하나만두기(game: GameDriver): Promise<void> {
  const 던전 = new 던전화면(game);
  await 적모두처치(game);
  if (!(await 던전.임프다사라질때까지(30_000))) throw new Error('「/gm killall」 뒤 임프가 30초 안에 다 사라지지 않았습니다');
  await 불러내기(game, 'imp');
  await game.waitFor(던전화면.임프, { timeoutMs: 15_000 });
}

export async function 떠오른글읽기(game: GameDriver, 주소: string, 한도ms = 15_000): Promise<떠오른글 | null> {
  const 끝 = Date.now() + 한도ms;
  do {
    const 읽음 = await Promise.all([game.find(주소), game.get(주소, 'TextMeshProUGUI.color')]).catch(() => null);
    if (읽음 !== null && 읽음[0] !== null) return { 글: 색뗀글(읽음[0].text ?? ''), 색: 색이름(읽음[1]) };
  } while (Date.now() < 끝);
  return null;
}

export async function 때리며머리위숫자읽기(game: GameDriver, 던전: 던전화면, 주소: string): Promise<떠오른글 | null> {
  for (let 번 = 0; 번 < 3; 번 += 1) {
    if (!(await 던전.임프있나())) return null;
    await 던전.임프고르고공격();
    const 값 = await 떠오른글읽기(game, 주소, 6_000);
    if (값 !== null) return 값;
  }
  return null;
}

export async function 봇GM값(admin: APIRequestContext, 봇: string, 명령: string, 마지막키: string): Promise<Record<string, string>> {
  await 봇기록(admin, 봇, true);
  await 봇시키기(admin, 봇, `gm:${명령}`);
  const 줄 = await 봇기록기다리기(admin, 봇, (x) => x.type === 'toast' && 봇줄글(x).includes(`${마지막키}=`), 20_000);
  if (줄 === null) throw new Error(`봇 ${봇} 에게 「/gm ${명령}」을 시켰지만 ${마지막키}= 줄이 20초 안에 안 왔습니다`);
  return GM값풀기([색뗀글(봇줄글(줄))]);
}

export async function 봇이던전에있을때까지(admin: APIRequestContext, 봇: string, 한도ms = 90_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    await 봇기록(admin, 봇, true);
    await 봇시키기(admin, 봇, 'gm:stat');
    const 줄 = await 봇기록기다리기(admin, 봇, (x) => x.type === 'toast' && 봇줄글(x).includes('직업='), 4_000);
    if (줄 !== null) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 골드가넘을때까지(game: GameDriver, 기준: number, 한도ms = 15_000): Promise<number> {
  const 끝 = Date.now() + 한도ms;
  let 값 = 기준;
  do {
    값 = Number(색뗀글(await game.text('/Showcase HUD/PlayerBar/Label[1]/Text')).replace(/[^0-9]/g, ''));
    if (값 > 기준) return 값;
  } while (Date.now() < 끝);
  return 값;
}

export interface 막대자리 {
  rect: number[] | undefined;
  screen: number[] | undefined;
}

export async function 상단바자리(game: GameDriver): Promise<막대자리> {
  const 막대 = await game.find('/Showcase HUD/PlayerBar');
  return { rect: 막대?.rect, screen: 막대?.screen };
}

export async function 경험치막대가득(game: GameDriver): Promise<boolean> {
  const 막대 = await game.find('/Showcase HUD/PlayerBar/Bar');
  const 채움 = await game.find('/Showcase HUD/PlayerBar/Bar/Fill');
  const 전체 = 막대?.rect?.[2];
  const 찬 = 채움?.rect?.[2];
  if (전체 === undefined || 찬 === undefined) return false;
  return Math.abs(전체 - 찬) <= 2;
}

export async function 가방줄이생길때까지(가방: 가방창, 글: string, 한도ms = 10_000): Promise<number | null> {
  return 찾을때까지(() => 가방.줄찾기(글), 한도ms);
}

export async function 현재골드(game: GameDriver): Promise<number> {
  return Number(색뗀글(await game.text('/Showcase HUD/PlayerBar/Label[1]/Text')).replace(/[^0-9]/g, ''));
}

export async function 사기(game: GameDriver, 이름: string): Promise<void> {
  const 상점 = await 상점창.열기(game);
  const 번호 = await 상점.줄찾기(이름);
  if (번호 === null) throw new Error(`상점에 ${이름} 줄이 없습니다`);
  const 전 = await 현재골드(game);
  await 상점.구매누르기(번호);
  if (!(await 될때까지(async () => (await 현재골드(game)) < 전, 15_000))) throw new Error(`${이름} 을 사도 골드가 줄지 않았습니다`);
  await 상점.닫기();
  await 상점.닫힐때까지();
}

export async function 가방에있나(game: GameDriver, 이름: string): Promise<boolean> {
  const 가방 = await 가방창.열기(game);
  const 줄 = await 가방줄이생길때까지(가방, 이름);
  await 가방.닫기();
  await 가방.닫힐때까지();
  return 줄 !== null;
}

export async function 우편받기(game: GameDriver, 제목: string): Promise<boolean> {
  const hud = new 공통HUD(game);
  if (!(await hud.알림뜸('새 우편', 40_000))) return false;
  const 창 = await 우편함창.열기(game);
  const 번호 = await 찾을때까지(() => 창.줄찾기(제목), 15_000);
  if (번호 === null) return false;
  await 창.받기(번호);
  const 받음 = await 될때까지(async () => !(await 창.받기버튼있나(번호)), 10_000);
  await 창.닫기();
  await 창.닫힐때까지();
  return 받음;
}

export async function 가방에서끼기(game: GameDriver, 이름: string, 칸: '무기' | '갑옷' | '장신구'): Promise<boolean> {
  const 가방 = await 가방창.열기(game);
  const 줄 = await 가방줄이생길때까지(가방, 이름);
  if (줄 === null) return false;
  await 가방.줄버튼누르기(줄, '장착');
  const 끼움 = await 될때까지(async () => ((await 가방.칸내용(칸)) ?? '').includes(이름), 10_000);
  await 가방.닫기();
  await 가방.닫힐때까지();
  return 끼움;
}

export async function 장착풀기(game: GameDriver, 칸: '무기' | '갑옷' | '장신구'): Promise<void> {
  const 가방 = await 가방창.열기(game);
  if (await 가방.해제버튼있나(칸)) {
    await 가방.해제누르기(칸);
    await 될때까지(async () => !(await 가방.해제버튼있나(칸)), 10_000);
  }
  await 가방.닫기();
  await 가방.닫힐때까지();
}

export async function 체력물약비우기(game: GameDriver): Promise<boolean> {
  const 가방 = await 가방창.열기(game);
  for (let 번 = 0; 번 < 6; 번 += 1) {
    const 줄 = await 가방.줄찾기('체력 물약');
    if (줄 === null) {
      await 가방.닫기();
      await 가방.닫힐때까지();
      return true;
    }
    const 전 = await 가방.줄이름(줄);
    await 가방.줄버튼누르기(줄, '판매');
    await 될때까지(async () => {
      const 새줄 = await 가방.줄찾기('체력 물약');
      return 새줄 === null || (await 가방.줄이름(새줄)) !== 전;
    }, 5_000);
  }
  const 남음 = (await 가방.줄찾기('체력 물약')) !== null;
  await 가방.닫기();
  await 가방.닫힐때까지();
  return !남음;
}

export async function 파티맺기(game: GameDriver, admin: APIRequestContext, 나: 계정, 봇: string): Promise<boolean> {
  const 창 = await 친구파티창.열기(game);
  await 창.이름넣기(봇);
  await 창.파티초대누르기();
  const 받음 = await 봇기록기다리기(admin, 봇, (x) => x.type === 'invite', 20_000);
  if (받음 === null) return false;
  await 봇시키기(admin, 봇, `party_accept:${나.아이디}`);
  const 맺음 = await 될때까지(async () => (await 창.파티머리줄()) !== null, 20_000);
  await 창.닫기();
  await 창.닫힐때까지();
  return 맺음;
}

export async function 보상버튼이눌릴때까지(창: 퀘스트창, 번호: number, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await 창.보상버튼있나(번호)) && (await 창.보상버튼눌림(번호))) return true;
  } while (Date.now() < 끝);
  return false;
}

const 스킬이름들 = ['전투 망치', '방패 오라', '돌진', '화살 쏘기', '강화 사격', '일제 사격', '마력탄', '치유의 손길', '급소 찌르기', '질주 공격', '은신', '부활', '들기', '내려놓기'];

export function 스킬조각(줄들: string[], 스킬: string): string | null {
  const 합침 = 줄들.join(' | ');
  const 시작 = 합침.indexOf(스킬);
  if (시작 < 0) return null;
  let 끝 = 합침.length;
  for (const 다른 of 스킬이름들) {
    if (다른 === 스킬) continue;
    const 자리 = 합침.indexOf(다른, 시작 + 스킬.length);
    if (자리 >= 0 && 자리 < 끝) 끝 = 자리;
  }
  const 줄끝 = 합침.indexOf(' | ', 시작);
  if (줄끝 >= 0 && 줄끝 < 끝) 끝 = 줄끝;
  return 합침.slice(시작, 끝);
}

export function 몬스터줄(줄들: string[], 이름: string): string | null {
  return 줄들.find((줄) => 줄.startsWith(이름) && /^[\s:=(]|^$/.test(줄.slice(이름.length))) ?? null;
}

export function 수치들(조각: string | null, 이름들: string[]): number[] {
  if (조각 === null) return [];
  const 값: number[] = [];
  for (const 이름 of 이름들) {
    for (const 맞음 of 조각.matchAll(new RegExp(`${이름}\\s*[=:]?\\s*[(\\[]?\\s*(\\d+(?:\\.\\d+)?|없음|-)`, 'g'))) {
      const 글 = 맞음[1] ?? '';
      값.push(/^\d/.test(글) ? Number(글) : 0);
    }
    if (값.length > 0) break;
  }
  return 값;
}

export const 첫수치 = (조각: string | null, 이름들: string[]): number | null => 수치들(조각, 이름들)[0] ?? null;

export async function 알림없음(game: GameDriver, 글들: string[]): Promise<boolean> {
  for (const 글 of 글들) {
    if ((await game.find(공통HUD.알림(글))) !== null) return false;
  }
  return true;
}

export async function 물약글이될때까지(game: GameDriver, 글: string, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(공통HUD.물약글, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 물약두번누르기(game: GameDriver): Promise<void> {
  await game.click(공통HUD.물약버튼, { count: 2, interval: 0.1 });
}

export async function 가방줄이름이될때까지(가방: 가방창, 번호: number, 글: string, 한도ms = 10_000): Promise<boolean> {
  return 될때까지(async () => ((await 가방.줄이름(번호)) ?? '').includes(글), 한도ms);
}
