import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 가입, 로그인, 무작위글자, 새비밀번호, 새아이디 } from './api.helper.js';

export type 직업 = 'Warrior' | 'Archer' | 'Mage';
export type 구역 = 'Town' | 'Beginner' | 'Intermediate' | 'Boss';

export interface 플레이어 {
  토큰: string;
  캐릭터번호: number;
}

export interface 아이템 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  equippedSlot: string | null;
  sellPrice: number;
}

export interface 가방 {
  capacity: number;
  used: number;
  gold: number;
  items: 아이템[];
}

export interface 성향 {
  value: number;
  state: string;
  purpleUntil: string | null;
}

export interface 능력치 {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
}

export interface 캐릭터 {
  id: number;
  name: string;
  classType: string;
  gender: string;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  position: { x: number; y: number; z: number };
  zone: string;
  stats: 능력치;
  alignment: 성향;
  pkKills: number;
  pkDeaths: number;
}

export interface 스폰 {
  id: string;
  zone: string;
  monster: string;
  x: number;
  z: number;
}

export interface 봇 {
  id: number;
  name: string;
  classType: string;
  level: number;
  zone: string;
  temperament: string;
  alignment: 성향;
  isDead: boolean;
  respawnAt: string | null;
  equipment: 아이템[];
  itemCount: number;
}

export interface 바닥아이템 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  zone: string;
  x: number;
  z: number;
  expiresAt: string;
}

export const 사냥터좌표: Record<'Beginner' | 'Intermediate' | 'Boss', { x: number; z: number }> = {
  Beginner: { x: 100, z: 150 },
  Intermediate: { x: 100, z: 250 },
  Boss: { x: 200, z: 350 },
};

export const 마을좌표 = { x: 200, z: 30 };

const 쉬기 = (밀리초: number) => new Promise<void>((풀기) => setTimeout(풀기, 밀리초));

export async function 값읽기<T>(응답: APIResponse): Promise<T> {
  return JSON.parse(await 응답.text()) as T;
}

export async function 오류코드읽기(응답: APIResponse): Promise<string> {
  try {
    const 값 = JSON.parse(await 응답.text()) as { code?: unknown };
    return typeof 값.code === 'string' ? 값.code : '';
  } catch {
    return '';
  }
}

export function 새캐릭터이름(길이 = 10): string {
  return `a${무작위글자(길이 - 1)}`;
}

interface 부를때 {
  토큰?: string;
  캐릭터번호?: number;
  본문?: unknown;
}

export async function 부르기(request: APIRequestContext, 방식: string, 경로: string, 옵션: 부를때 = {}): Promise<APIResponse> {
  const headers: Record<string, string> = {};
  if (옵션.토큰 !== undefined) headers.Authorization = `Bearer ${옵션.토큰}`;
  if (옵션.캐릭터번호 !== undefined) headers['X-Character-Id'] = String(옵션.캐릭터번호);
  return request.fetch(경로, {
    method: 방식,
    headers,
    ...(옵션.본문 === undefined ? {} : { data: 옵션.본문 }),
  });
}

const 게임 = (p: 플레이어, 본문?: unknown): 부를때 => ({
  토큰: p.토큰,
  캐릭터번호: p.캐릭터번호,
  ...(본문 === undefined ? {} : { 본문 }),
});

export async function 계정만들기(request: APIRequestContext): Promise<string> {
  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();
  await 가입(request, 아이디, 비밀번호);
  const 응답 = await 로그인(request, 아이디, 비밀번호);
  const 값 = await 값읽기<{ accessToken?: string }>(응답);
  return 값.accessToken ?? '';
}

export async function 캐릭터만들기(
  request: APIRequestContext,
  토큰: string,
  직업이름: 직업 = 'Warrior',
  이름: string = 새캐릭터이름(),
): Promise<APIResponse> {
  return 부르기(request, 'POST', '/characters', {
    토큰,
    본문: { name: 이름, classType: 직업이름, gender: 'Female' },
  });
}

export async function 캐릭터번호읽기(응답: APIResponse): Promise<number> {
  try {
    const 값 = JSON.parse(await 응답.text()) as { id?: unknown };
    return typeof 값.id === 'number' ? 값.id : 0;
  } catch {
    return 0;
  }
}

export async function 플레이어만들기(request: APIRequestContext, 직업이름: 직업 = 'Warrior', 토큰?: string): Promise<플레이어> {
  const 쓸토큰 = 토큰 ?? (await 계정만들기(request));
  const 응답 = await 캐릭터만들기(request, 쓸토큰, 직업이름);
  return { 토큰: 쓸토큰, 캐릭터번호: await 캐릭터번호읽기(응답) };
}

export async function 캐릭터읽기(request: APIRequestContext, p: 플레이어): Promise<캐릭터> {
  return 값읽기<캐릭터>(
    await 부르기(request, 'GET', `/characters/${p.캐릭터번호}`, {
      토큰: p.토큰,
    }),
  );
}

export async function 가방읽기(request: APIRequestContext, p: 플레이어): Promise<가방> {
  return 값읽기<가방>(
    await 부르기(request, 'GET', `/characters/${p.캐릭터번호}/inventory`, {
      토큰: p.토큰,
    }),
  );
}

export async function 캐릭터지우기(request: APIRequestContext, p: 플레이어): Promise<APIResponse> {
  return 부르기(request, 'DELETE', `/characters/${p.캐릭터번호}`, {
    토큰: p.토큰,
  });
}

export async function 위치옮기기(request: APIRequestContext, p: 플레이어, x: number, z: number): Promise<APIResponse> {
  return 부르기(request, 'PUT', `/characters/${p.캐릭터번호}/position`, {
    토큰: p.토큰,
    본문: { x, y: 0, z },
  });
}

export async function 장착(request: APIRequestContext, p: 플레이어, 아이템번호: number): Promise<APIResponse> {
  return 부르기(request, 'POST', `/characters/${p.캐릭터번호}/equip`, {
    토큰: p.토큰,
    본문: { itemId: 아이템번호 },
  });
}

export async function 해제(request: APIRequestContext, p: 플레이어, 아이템번호: number): Promise<APIResponse> {
  return 부르기(request, 'POST', `/characters/${p.캐릭터번호}/unequip`, {
    토큰: p.토큰,
    본문: { itemId: 아이템번호 },
  });
}

export async function 장비다해제(request: APIRequestContext, p: 플레이어): Promise<void> {
  const 지금 = await 가방읽기(request, p);
  for (const 것 of 지금.items.filter((i) => i.equippedSlot !== null)) await 해제(request, p, 것.id);
}

export async function 아이템쓰기(request: APIRequestContext, p: 플레이어, 아이템번호: number): Promise<APIResponse> {
  return 부르기(request, 'POST', `/characters/${p.캐릭터번호}/use-item`, {
    토큰: p.토큰,
    본문: { itemId: 아이템번호 },
  });
}

export async function PK기록(request: APIRequestContext, p: 플레이어): Promise<APIResponse> {
  return 부르기(request, 'GET', `/characters/${p.캐릭터번호}/pk-history`, {
    토큰: p.토큰,
  });
}

export async function GM골드(request: APIRequestContext, p: 플레이어, 양: number): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/gold', 게임(p, { amount: 양 }));
}

export async function GM아이템(request: APIRequestContext, p: 플레이어, 템플릿: string, 수량 = 1, 강화수치 = 0): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/item', 게임(p, { templateId: 템플릿, quantity: 수량, enhanceLevel: 강화수치 }));
}

export async function GM레벨(request: APIRequestContext, p: 플레이어, 레벨: number): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/level', 게임(p, { level: 레벨 }));
}

export async function GM성향(request: APIRequestContext, p: 플레이어, 값: number, 보라지우기 = true): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/alignment', 게임(p, { value: 값, clearPurple: 보라지우기 }));
}

export async function GM설정(request: APIRequestContext, p: 플레이어): Promise<APIResponse> {
  return 부르기(request, 'GET', '/gm/config', 게임(p));
}

export async function GM강화확률(request: APIRequestContext, p: 플레이어, 본문: unknown): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/enhance-rate', 게임(p, 본문));
}

export async function GM드랍설정(request: APIRequestContext, p: 플레이어, 본문: unknown): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/drop-rate', 게임(p, 본문));
}

export async function GM봇리셋(request: APIRequestContext, p: 플레이어, 구역이름?: 구역): Promise<APIResponse> {
  return 부르기(request, 'POST', '/gm/bot/reset', 게임(p, 구역이름 === undefined ? {} : { zone: 구역이름 }));
}

export async function 상점목록(request: APIRequestContext, p: 플레이어): Promise<APIResponse> {
  return 부르기(request, 'GET', '/shop/items', 게임(p));
}

export async function 사기(request: APIRequestContext, p: 플레이어, 템플릿: string, 수량 = 1): Promise<APIResponse> {
  return 부르기(request, 'POST', '/shop/buy', 게임(p, { templateId: 템플릿, quantity: 수량 }));
}

export async function 팔기(request: APIRequestContext, p: 플레이어, 아이템번호: number, 수량 = 1): Promise<APIResponse> {
  return 부르기(request, 'POST', '/shop/sell', 게임(p, { itemId: 아이템번호, quantity: 수량 }));
}

export async function 강화(request: APIRequestContext, p: 플레이어, 아이템번호: number, 주문서번호: number): Promise<APIResponse> {
  let 응답 = await 부르기(request, 'POST', '/enhance', 게임(p, { itemId: 아이템번호, scrollId: 주문서번호 }));
  for (let i = 0; i < 5 && 응답.status() === 409 && (await 오류코드읽기(응답)) === 'COOLDOWN'; i += 1) {
    await 쉬기(600);
    응답 = await 부르기(request, 'POST', '/enhance', 게임(p, { itemId: 아이템번호, scrollId: 주문서번호 }));
  }
  return 응답;
}

export function 템플릿찾기(지금: 가방, 템플릿: string, 강화수치?: number): 아이템 | undefined {
  return 지금.items.find((i) => i.templateId === 템플릿 && (강화수치 === undefined || i.enhanceLevel === 강화수치));
}

export async function 가방채우기(request: APIRequestContext, p: 플레이어): Promise<가방> {
  const 지금 = await 가방읽기(request, p);
  const 남은칸 = 지금.capacity - 지금.used;
  if (남은칸 > 0) await GM아이템(request, p, 'sword_short', 남은칸);
  return 가방읽기(request, p);
}
