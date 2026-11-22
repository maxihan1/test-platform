import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 공통HUD } from '../components/hud.component.js';
import { 알림띠 } from '../components/toast.component.js';
import { 가방창, type 장착칸 } from '../pages/bag.page.js';
import type { 던전화면 } from '../pages/dungeon.page.js';
import { 친구파티창 } from '../pages/friends.page.js';
import { 퀘스트창 } from '../pages/quest.page.js';
import { 상점창 } from '../pages/shop.page.js';
import { 던전입장, 방로비로 } from './game-enter.helper.js';
import { 봇기록기다리기, 봇시키기, 봇켜기, 우편지급, 캐릭터읽기 } from './game-state.helper.js';
import { GM골드, GM데이터, GM보스방가기, GM보스처치, GM전리품, GM퀘스트리셋, type 스탯, 스탯숫자 } from './gm.helper.js';

export const 장비칸: Record<string, 장착칸> = {
  '녹슨 단검': '무기',
  '강철 롱소드': '무기',
  '룬 새김 도끼': '무기',
  '가죽 갑옷': '갑옷',
  '사슬 갑옷': '갑옷',
  '행운의 반지': '장신구',
  '현자의 목걸이': '장신구',
  '용비늘 갑옷': '갑옷',
};

const 겹침글 = '하나를 고를 수 없습니다';

async function 알림있나(game: GameDriver): Promise<boolean> {
  try {
    if ((await game.find(`${알림띠.뿌리}/Toast/Text`)) !== null) return true;
    return (await game.find(`${알림띠.뿌리}/Toast[0]/Text`)) !== null;
  } catch (e) {
    if (e instanceof Error && e.message.includes(겹침글)) return true;
    throw e;
  }
}

export async function 알림이모두사라질때까지(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if (!(await 알림있나(game))) return true;
    if (Date.now() > 끝) return false;
  }
}

export async function 알림이떠있나(game: GameDriver): Promise<boolean> {
  return 알림있나(game);
}

export async function 알림글읽기(game: GameDriver, 부분글: string, 한도ms = 10_000): Promise<string | null> {
  const 알림 = new 알림띠(game);
  if (!(await 알림.뜰때까지(부분글, 한도ms))) return null;
  try {
    return await game.text(알림.글주소(부분글));
  } catch (e) {
    if (e instanceof Error && e.message.includes(겹침글)) return (await 알림.글들()).filter((글) => 글.includes(부분글)).join(' | ');
    throw e;
  }
}

export async function 상점에서사기(game: GameDriver, 이름들: string[]): Promise<void> {
  const 상점 = await 상점창.열기(game);
  for (const 이름 of 이름들) {
    const 전 = await 상점.보유골드();
    await 상점.구매하기(이름);
    await 상점.보유골드가바뀔때까지(전);
  }
  await 상점.닫기();
}

export async function 장비끼기(game: GameDriver, 이름: string): Promise<void> {
  const 칸 = 장비칸[이름];
  if (칸 === undefined) throw new Error(`장비 칸을 모르는 아이템입니다: ${이름}`);
  await 상점에서사기(game, [이름]);
  const 가방 = await 가방창.열기(game);
  await 가방.줄이생길때까지(이름);
  await 가방.장착하기(이름);
  await 가방.칸이될때까지(칸, 이름);
  await 가방.닫기();
}

export async function 퀘스트처음으로(game: GameDriver): Promise<string> {
  await GM퀘스트리셋(game);
  const 창 = await 퀘스트창.열기(game);
  const 글 = (await 창.줄들()).map((줄) => 줄.진행글).join(' · ');
  await 창.닫기();
  return 글;
}

export async function 가방요약(game: GameDriver): Promise<string> {
  const 가방 = await 가방창.열기(game);
  const 글 = (await 가방.줄들()).map((줄) => (줄.개수 > 1 ? `${줄.이름} x${String(줄.개수)}` : 줄.이름)).join(', ');
  await 가방.닫기();
  return 글;
}

export async function 가방개수읽기(game: GameDriver, 이름: string): Promise<number> {
  const 가방 = await 가방창.열기(game);
  const 줄 = await 가방.줄찾기(이름);
  await 가방.닫기();
  return 줄?.개수 ?? 0;
}

export async function 우편받기(game: GameDriver, 한도ms = 40_000): Promise<boolean> {
  const 창 = '/Showcase HUD/Window 우편함';
  const 받기 = `${창}/Panel 우편함/Scroll/Content/Row/Button 받기`;
  const 닫기 = `${창}/Panel 우편함/Button 닫기`;
  const 끝 = Date.now() + 한도ms;
  while (Date.now() < 끝) {
    await new 공통HUD(game).메뉴누르기('우편');
    await game.waitFor(`${창}/Panel 우편함`, { timeoutMs: 10_000 });
    const 있다 = await game.waitFor(받기, { timeoutMs: 8_000 }).then(
      () => true,
      () => false,
    );
    if (있다) {
      await game.click(받기);
      await game.waitFor(받기, { gone: true, timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
    }
    await game.click(닫기);
    await game.waitFor(창, { gone: true, timeoutMs: 10_000 });
    if (있다) return true;
  }
  return false;
}

export async function 우편으로아이템받기(game: GameDriver, admin: APIRequestContext, 아이디: string, 아이템이름: string): Promise<void> {
  const 캐릭터 = await 캐릭터읽기(admin, 아이디);
  await 우편지급(admin, 캐릭터.id, { 제목: '[QA] 아이템 지급', 아이템: [{ itemName: 아이템이름, quantity: 1 }] });
  if (!(await 우편받기(game))) throw new Error(`우편을 40초 안에 받지 못했습니다(${아이템이름})`);
}

export async function 초대수락(game: GameDriver, 한도ms = 20_000): Promise<void> {
  const 창 = '/Showcase HUD/Invite/Panel 파티 초대';
  await game.waitFor(창, { timeoutMs: 한도ms });
  await game.click(`${창}/Button 수락`);
  await game.waitFor(창, { gone: true, timeoutMs: 10_000 });
}

export async function 봇과던전입장(admin: APIRequestContext, game: GameDriver, 아이디: string, 비밀번호: string): Promise<{ 봇: string; 던전: 던전화면 }> {
  const 봇 = await 봇켜기(admin, 아이디, 비밀번호);
  await 봇시키기(admin, 봇, 'seat:2');
  await 봇시키기(admin, 봇, 'ready');
  const 던전 = await 던전입장(game, '탱커');
  return { 봇, 던전 };
}

export async function 봇과파티로던전입장(admin: APIRequestContext, game: GameDriver, 아이디: string, 비밀번호: string): Promise<{ 봇: string; 던전: 던전화면 }> {
  const 봇 = await 봇켜기(admin, 아이디, 비밀번호);
  const 창 = await 친구파티창.열기(game);
  await 창.파티초대(봇);
  const 초대 = await 봇기록기다리기(admin, 봇, (줄) => 줄.type === 'invite', 20_000);
  if (초대 === null) throw new Error(`봇 ${봇} 이 파티 초대를 20초 안에 받지 못했습니다`);
  await 봇시키기(admin, 봇, `party_accept:${아이디}`);
  if (!(await 창.머리줄기다리기('파티 2/4'))) throw new Error('파티에 두 명이 모인 것을 확인하지 못했습니다');
  await 창.닫기();
  await 봇시키기(admin, 봇, 'seat:2');
  await 봇시키기(admin, 봇, 'ready');
  const 던전 = await 던전입장(game, '탱커');
  return { 봇, 던전 };
}

export async function 보스전리품받기(admin: APIRequestContext, game: GameDriver, 아이템: string): Promise<void> {
  await 던전입장(game, '탱커');
  await GM보스방가기(game);
  await GM전리품(game, 아이템);
  await GM보스처치(game);
  await 방로비로(admin, game);
  await GM전리품(game, 'off');
}

export async function 불러낸임프잡기(던전: 던전화면): Promise<boolean> {
  await 던전.임프공격();
  for (let 번 = 0; 번 < 8; 번 += 1) {
    if (await 던전.임프사라질때까지(4_000)) return true;
    await 던전.공격누르기();
  }
  return 던전.임프사라질때까지(4_000);
}

export interface 아이템표줄 {
  분류: string;
  등급: string;
  상점가: number | string;
  판매가: number;
  공격: number;
  방어: number;
  골드획득: number;
  경험치획득: number;
  설명: string;
}

export async function 아이템표읽기(game: GameDriver): Promise<Record<string, 아이템표줄>> {
  const 표: Record<string, 아이템표줄> = {};
  for (const 줄 of await GM데이터(game, 'item')) {
    const 맞음 = /^(.+?) 분류=(\S+) 등급=(\S+) 상점가=(\S+) 판매가=(\S+) 공격=(\S+) 방어=(\S+) 골드획득=(\S+) 경험치획득=(\S+) 설명=(.*)$/.exec(줄);
    if (맞음 === null) throw new Error(`/gm data item 줄 꼴을 못 읽었습니다: ${줄}`);
    const [, 이름 = '', 분류 = '', 등급 = '', 상점가 = '', 판매가 = '', 공격 = '', 방어 = '', 골드획득 = '', 경험치획득 = '', 설명 = ''] = 맞음;
    표[이름] = {
      분류,
      등급,
      상점가: /^\d+$/.test(상점가) ? Number(상점가) : 상점가,
      판매가: Number(판매가),
      공격: Number(공격),
      방어: Number(방어),
      골드획득: Number(골드획득),
      경험치획득: Number(경험치획득),
      설명,
    };
  }
  return 표;
}

function 퍼센트(값: number): string {
  return `${String(Math.round(값 * 100))}%`;
}

export function 효과글(줄: 아이템표줄): string {
  if (줄.공격 > 0) return `공격 +${퍼센트(줄.공격)}`;
  if (줄.방어 > 0) return `받는 피해 −${퍼센트(줄.방어)}`;
  if (줄.골드획득 > 0) return `골드 획득 +${퍼센트(줄.골드획득)}`;
  if (줄.경험치획득 > 0) return `경험치 획득 +${퍼센트(줄.경험치획득)}`;
  return '없음';
}

export function 표값(줄: 아이템표줄 | undefined, 효과도: boolean): Record<string, string | number> | null {
  if (줄 === undefined) return null;
  const 값: Record<string, string | number> = { 분류: 줄.분류, 등급: 줄.등급, 상점가: 줄.상점가, 판매가: 줄.판매가, 설명: 줄.설명 };
  if (효과도) 값['효과'] = 효과글(줄);
  return 값;
}

export async function 골드맞추기(game: GameDriver, 값: number): Promise<boolean> {
  await GM골드(game, 값);
  return new 공통HUD(game).골드가될때까지(값);
}

export async function 메뉴창열림(game: GameDriver, 메뉴: '가방' | '상점' | '퀘스트'): Promise<boolean> {
  const 주소 = {
    가방: { 제목: 가방창.제목, 닫기: 가방창.닫기버튼, 창: 가방창.창 },
    상점: { 제목: 상점창.제목, 닫기: 상점창.닫기버튼, 창: 상점창.창 },
    퀘스트: { 제목: 퀘스트창.제목, 닫기: 퀘스트창.닫기버튼, 창: 퀘스트창.창 },
  }[메뉴];
  await new 공통HUD(game).메뉴누르기(메뉴);
  const 열림 = await game.waitFor(주소.제목, { timeoutMs: 15_000 }).then(
    () => true,
    () => false,
  );
  if (열림) {
    await game.click(주소.닫기);
    await game.waitFor(주소.창, { gone: true, timeoutMs: 10_000 });
  }
  return 열림;
}

const 레벨누적경험치: Record<number, number> = { 1: 0, 2: 100, 3: 382, 4: 901, 5: 1701 };

export function 총경험치(값: 스탯): number {
  const 레벨 = 스탯숫자(값, '레벨');
  const 누적 = 레벨누적경험치[레벨];
  if (누적 === undefined) throw new Error(`레벨 ${String(레벨)} 의 누적 경험치 표가 없습니다(1~5 만 있음)`);
  return 누적 + 스탯숫자(값, '경험치');
}

export function 글숫자들(글: string): number[] {
  return (글.replace(/<[^>]+>/g, '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function 색칸(값: unknown): number[] {
  let 칸: number[] = [];
  if (typeof 값 === 'string') {
    칸 = 값.startsWith('#') ? [1, 3, 5].map((i) => parseInt(값.slice(i, i + 2), 16) / 255) : (값.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  } else if (Array.isArray(값)) {
    칸 = 값.map(Number);
  } else if (typeof 값 === 'object' && 값 !== null) {
    const 칸값 = 값 as Record<string, unknown>;
    칸 = [Number(칸값['r']), Number(칸값['g']), Number(칸값['b'])];
  }
  if (칸.length < 3 || 칸.some((n) => Number.isNaN(n))) throw new Error(`색 값을 못 풀었습니다: ${JSON.stringify(값)}`);
  const 크기 = Math.max(...칸.slice(0, 3)) > 1 ? 255 : 1;
  return 칸.slice(0, 3).map((n) => n / 크기);
}

export function 초록인가(값: unknown): boolean {
  const [r = 0, g = 0, b = 0] = 색칸(값);
  return g > 0.6 && r < 0.55 && b < 0.55;
}
