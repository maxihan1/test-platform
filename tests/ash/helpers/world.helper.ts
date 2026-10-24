import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { type 가방, type 구역, type 능력치, 머리, type 바닥아이템, 본문, type 봇, type 성향상태, type 스폰, type 아이템, 인증머리, type 캐릭터, type 캐릭터정보 } from './api.helper.js';
import { 봇목록, 월드초기화 } from './game-state.helper.js';
import { GM콘솔 } from '../pages/gm-console.page.js';
import { 월드화면 } from '../pages/world.page.js';

export const 없는번호 = 2_000_000_000;

export interface 처치결과 {
  goldGained: number;
  expGained: number;
  leveledUp: boolean;
  character: 캐릭터정보;
}

export interface 사망결과 {
  expLost: number;
  dropped: 바닥아이템 | null;
  character: 캐릭터정보;
}

export interface 봇처치결과 {
  dropped: 아이템 | null;
  droppedToGround: boolean;
  groundItemId: number | null;
  alignmentDelta: number;
  character: 캐릭터정보;
  bot: 봇;
}

export type 죽인것 = { 종류: 'Monster' | 'Bot' | 'Guard'; 번호: number | null };

export async function 스폰표받기(요청: APIRequestContext, 누구: 캐릭터): Promise<스폰[]> {
  return 본문(await 요청.get('/world/spawns', { headers: 머리(누구) }), '스폰 표');
}

export async function 몬스터처치보내기(
  요청: APIRequestContext,
  누구: 캐릭터,
  몬스터: 스폰['monster'],
  스폰값: 스폰,
  자리: { x: number; z: number } = 스폰값,
): Promise<APIResponse> {
  return 요청.post('/combat/monster-kill', { headers: 머리(누구), data: { monsterId: 몬스터, spawnId: 스폰값.id, x: 자리.x, z: 자리.z } });
}

export async function 몬스터처치(요청: APIRequestContext, 누구: 캐릭터, 스폰값: 스폰, 자리: { x: number; z: number } = 스폰값): Promise<처치결과> {
  return 본문(await 몬스터처치보내기(요청, 누구, 스폰값.monster, 스폰값, 자리), '몬스터 처치');
}

export async function 봇처치보내기(요청: APIRequestContext, 누구: 캐릭터, 봇번호: number, 자리: { x: number; z: number }): Promise<APIResponse> {
  return 요청.post('/combat/bot-kill', { headers: 머리(누구), data: { botId: 봇번호, x: 자리.x, z: 자리.z } });
}

export async function 봇처치(요청: APIRequestContext, 누구: 캐릭터, 봇번호: number, 자리: { x: number; z: number }): Promise<봇처치결과> {
  return 본문(await 봇처치보내기(요청, 누구, 봇번호, 자리), '봇 처치');
}

export async function 사망보고(
  요청: APIRequestContext,
  누구: 캐릭터,
  자리: { x: number; z: number },
  죽인: 죽인것 = { 종류: 'Monster', 번호: null },
): Promise<사망결과> {
  return 본문(
    await 요청.post('/combat/player-death', { headers: 머리(누구), data: { killerType: 죽인.종류, killerId: 죽인.번호, x: 자리.x, z: 자리.z } }),
    '사망 보고',
  );
}

export function 서버시각(응답: APIResponse): number {
  const 머릿글 = 응답.headers().date;
  if (머릿글 === undefined) throw new Error('응답에 서버 시각(Date 머리)이 없다');
  return Date.parse(머릿글);
}

export function 떨어진자리(스폰값: 스폰, 거리: number): { x: number; z: number } {
  return { x: 스폰값.x + 거리 <= 400 ? 스폰값.x + 거리 : 스폰값.x - 거리, z: 스폰값.z };
}

export function 가까운스폰(표: 스폰[], 어디: 구역, 자리: { x: number; z: number }): 스폰 {
  const 후보 = 표.filter((s) => s.zone === 어디);
  const 가장가까운 = 후보.reduce<스폰 | undefined>((앞, s) => {
    if (앞 === undefined) return s;
    return Math.hypot(s.x - 자리.x, s.z - 자리.z) < Math.hypot(앞.x - 자리.x, 앞.z - 자리.z) ? s : 앞;
  }, undefined);
  if (가장가까운 === undefined) throw new Error(`${어디} 구역에 스폰이 없다`);
  return 가장가까운;
}

export async function 장비벗기기(요청: APIRequestContext, 누구: 캐릭터): Promise<가방> {
  const 지금 = await 본문<가방>(await 요청.get(`/characters/${String(누구.번호)}/inventory`, { headers: 인증머리(누구) }), '가방 읽기');
  for (const 칸 of 지금.items.filter((i) => i.equippedSlot !== null)) {
    await 본문(await 요청.post(`/characters/${String(누구.번호)}/unequip`, { headers: 인증머리(누구), data: { itemId: 칸.id } }), '장비 해제');
  }
  return 본문(await 요청.get(`/characters/${String(누구.번호)}/inventory`, { headers: 인증머리(누구) }), '가방 읽기');
}

export async function 장착결과(요청: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<{ inventory: 가방; stats: 능력치 }> {
  return 본문(await 요청.post(`/characters/${String(누구.번호)}/equip`, { headers: 인증머리(누구), data: { itemId: 아이템번호 } }), '장착');
}

export async function 해제결과(요청: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<{ inventory: 가방; stats: 능력치 }> {
  return 본문(await 요청.post(`/characters/${String(누구.번호)}/unequip`, { headers: 인증머리(누구), data: { itemId: 아이템번호 } }), '장비 해제');
}

export async function 레벨바꾸기시도(admin: APIRequestContext, 누구: { 번호: number }, 레벨: number): Promise<APIResponse> {
  return admin.patch(`/admin/characters/${String(누구.번호)}`, { data: { level: 레벨 } });
}

export async function 봇고르기(
  admin: APIRequestContext,
  누구: { 토큰: string },
  어디: 구역,
  성향값: 성향상태,
  제외: number[] = [],
): Promise<봇> {
  const 찾기 = async (): Promise<봇 | undefined> =>
    (await 봇목록(admin, 누구, 어디)).find((b) => !b.isDead && b.alignment.state === 성향값 && !제외.includes(b.id));
  let 고른 = await 찾기();
  if (고른 === undefined) {
    await 월드초기화(admin, 어디);
    고른 = await 찾기();
  }
  if (고른 === undefined) throw new Error(`${어디} 구역에 살아 있는 ${성향값} 봇이 없다`);
  return 고른;
}

export function 색이름(색: number[]): string {
  const [빨강 = 0, 초록 = 0, 파랑 = 0] = 색;
  const 큰값 = Math.max(빨강, 초록, 파랑);
  const 작은값 = Math.min(빨강, 초록, 파랑);
  if (큰값 === 작은값) return '회색';
  const 폭 = 큰값 - 작은값;
  let 색상: number;
  if (큰값 === 빨강) 색상 = (((초록 - 파랑) / 폭) % 6) * 60;
  else if (큰값 === 초록) 색상 = ((파랑 - 빨강) / 폭 + 2) * 60;
  else 색상 = ((빨강 - 초록) / 폭 + 4) * 60;
  if (색상 < 0) 색상 += 360;
  if (색상 >= 340 || 색상 < 20) return '빨간색';
  if (색상 >= 180 && 색상 < 260) return '파란색';
  if (색상 >= 260 && 색상 < 330) return '보라색';
  return '그 밖의 색';
}

export function 키목록(값: unknown, 앞: string = ''): string[] {
  if (Array.isArray(값)) return 값.flatMap((칸) => 키목록(칸, 앞));
  if (값 === null || typeof 값 !== 'object') return [];
  return Object.entries(값 as Record<string, unknown>).flatMap(([이름, 속]) => [`${앞}${이름}`, ...키목록(속, `${앞}${이름}.`)]);
}

export async function 글이뜰때까지(game: GameDriver, 주소: string, 한도 = 15_000): Promise<string> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    const 글 = await game.text(주소);
    if (글 !== '') return 글;
    if (Date.now() >= 끝) throw new Error(`${주소} 에 ${String(한도 / 1000)}초 안에 글이 뜨지 않았다`);
    await new Promise((깨운다) => setTimeout(깨운다, 300));
  }
}

export async function 칸값읽기(game: GameDriver, 주소: string, 칸: string): Promise<unknown> {
  return game.get(주소, 칸);
}

export async function 값모으기(game: GameDriver, 주소: string, 칸: string, 한도: number): Promise<string[]> {
  const 모음: string[] = [];
  const 끝 = Date.now() + 한도;
  while (Date.now() < 끝) {
    const 값 = JSON.stringify(await game.get(주소, 칸));
    if (모음[모음.length - 1] !== 값) 모음.push(값);
    await new Promise((깨운다) => setTimeout(깨운다, 500));
  }
  return 모음;
}

export async function 위치표본모으기(game: GameDriver, 주소: string, 칸: string, 한도: number): Promise<{ x: number; z: number }[]> {
  const 표본: { x: number; z: number }[] = [];
  const 끝 = Date.now() + 한도;
  while (Date.now() < 끝) {
    const 위치 = (await game.get(주소, 칸)) as number[];
    표본.push({ x: 위치[0] ?? 0, z: 위치[2] ?? 0 });
    await new Promise((깨운다) => setTimeout(깨운다, 1_000));
  }
  return 표본;
}

export async function 부활할때까지(admin: APIRequestContext, 누구: { 토큰: string }, 봇번호: number, 한도 = 90_000): Promise<봇> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    const 지금 = (await 봇목록(admin, 누구)).find((b) => b.id === 봇번호);
    if (지금 === undefined) throw new Error(`봇 ${String(봇번호)} 이 목록에 없다`);
    if (!지금.isDead) return 지금;
    if (Date.now() >= 끝) throw new Error(`봇 ${String(봇번호)} 이 ${String(한도 / 1000)}초 안에 부활하지 않았다`);
    await new Promise((깨운다) => setTimeout(깨운다, 2_000));
  }
}

export async function 다른서버에서GM골드(요청: APIRequestContext, 서버주소: string): Promise<APIResponse> {
  const 기본 = 서버주소.replace(/\/+$/, '');
  const 아이디 = `qa${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 16);
  const 비밀번호 = `p${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
  await 본문(await 요청.post(`${기본}/auth/signup`, { data: { username: 아이디, password: 비밀번호 } }), '다른 서버 가입');
  const 받은 = await 본문<{ accessToken: string }>(await 요청.post(`${기본}/auth/login`, { data: { username: 아이디, password: 비밀번호 } }), '다른 서버 로그인');
  const 만든 = await 본문<캐릭터정보>(
    await 요청.post(`${기본}/characters`, {
      headers: { Authorization: `Bearer ${받은.accessToken}` },
      data: { name: `q${Math.random().toString(36).slice(2, 8)}`, classType: 'Warrior', gender: 'Male' },
    }),
    '다른 서버 캐릭터 만들기',
  );
  return 요청.post(`${기본}/gm/gold`, {
    headers: { Authorization: `Bearer ${받은.accessToken}`, 'X-Character-Id': String(만든.id) },
    data: { amount: 100 },
  });
}

export async function GM으로초록들판가기(game: GameDriver): Promise<void> {
  const 콘솔 = await GM콘솔.열기(game);
  await 콘솔.순간이동누르기('TeleportBeginner');
  await 콘솔.닫기누르기();
  await 콘솔.닫힐때까지();
  await new 월드화면(game).구역글뜰때까지('초록 들판');
}

export async function 값이바뀔때까지(game: GameDriver, 주소: string, 칸: string, 이전: unknown, 한도 = 10_000): Promise<unknown> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    const 지금 = await game.get(주소, 칸);
    if (JSON.stringify(지금) !== JSON.stringify(이전) || Date.now() >= 끝) return 지금;
    await new Promise((깨운다) => setTimeout(깨운다, 300));
  }
}

export async function 값이작아질때까지(game: GameDriver, 주소: string, 칸: string, 기준: number, 한도 = 30_000): Promise<number> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    const 지금 = Number(await game.get(주소, 칸));
    if (지금 < 기준 || Date.now() >= 끝) return 지금;
    await new Promise((깨운다) => setTimeout(깨운다, 500));
  }
}

export async function 바닥아이템사라질때까지(요청: APIRequestContext, 누구: 캐릭터, 어디: 구역, 번호: number, 한도 = 30_000): Promise<boolean> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    const 목록 = await 본문<바닥아이템[]>(await 요청.get(`/world/ground-items?zone=${어디}`, { headers: 머리(누구) }), '바닥 아이템 목록');
    if (!목록.some((i) => i.id === 번호)) return true;
    if (Date.now() >= 끝) return false;
    await new Promise((깨운다) => setTimeout(깨운다, 1_000));
  }
}
