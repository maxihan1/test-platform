import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import {
  가방,
  장착,
  새아이템주기,
  아이템주기,
  오류코드,
  응답몸,
  캐릭터읽기,
  플레이어머리,
  스폰목록,
  type 가방정보,
  type 구역,
  type 직업,
  type 스탯,
  type 스폰정보,
  type 아이템,
  type 캐릭터,
} from './game-state.helper.js';

async function 읽기<T>(res: APIResponse, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  return 응답몸<T>(res);
}

export interface 상점줄 {
  templateId: string;
  price: number;
}

export async function 상점목록(admin: APIRequestContext, 누구: 캐릭터): Promise<상점줄[]> {
  const 몸 = await 읽기<{ items: 상점줄[] }>(await admin.get('/shop/items', { headers: 플레이어머리(누구) }), `${누구.이름} 상점 목록 읽기`);
  return 몸.items;
}

export async function 상점사기(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 수량 = 1): Promise<APIResponse> {
  return admin.post('/shop/buy', { headers: 플레이어머리(누구), data: { templateId, quantity: 수량 } });
}

export async function 장비해제(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<{ inventory: 가방정보; stats: 스탯 }> {
  return 읽기(
    await admin.post(`/characters/${String(누구.id)}/unequip`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } }),
    `${누구.이름} 아이템 ${String(아이템번호)} 해제`,
  );
}

export async function 장비전부해제(admin: APIRequestContext, 누구: 캐릭터): Promise<스탯> {
  for (const i of (await 가방(admin, 누구)).items.filter((x) => x.equippedSlot !== null)) await 장비해제(admin, 누구, i.id);
  return (await 캐릭터읽기(admin, 누구)).stats;
}

export async function 아이템사용(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return admin.post(`/characters/${String(누구.id)}/use-item`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } });
}

export async function 하나받기(admin: APIRequestContext, 누구: 캐릭터, templateId: string): Promise<아이템> {
  const 받은 = (await 아이템주기(admin, 누구, templateId)).items.find((x) => x.templateId === templateId);
  if (받은 === undefined) throw new Error(`${templateId} 를 준 뒤 가방에 없다`);
  return 받은;
}

export async function 월드스폰표(admin: APIRequestContext, 누구: 캐릭터): Promise<스폰정보[]> {
  return 읽기(await admin.get('/world/spawns', { headers: 플레이어머리(누구) }), `${누구.이름} 스폰 표 읽기`);
}

export function 스폰수(표: 스폰정보[], 곳: 구역, 몬스터: string): number {
  return 표.filter((s) => s.zone === 곳 && s.monster === 몬스터).length;
}

export async function 스폰들(admin: APIRequestContext, 곳: 구역, 몬스터: string): Promise<스폰정보[]> {
  const 찾음 = (await 스폰목록(admin)).filter((s) => s.zone === 곳 && s.monster === 몬스터);
  if (찾음.length === 0) throw new Error(`${곳} 에 ${몬스터} 스폰이 없다`);
  return 찾음;
}

export function 필요경험치(레벨: number): number {
  return (100 * 레벨 * (레벨 + 1)) / 2;
}

const 직업표: Record<직업, { hp: [number, number]; mp: [number, number]; attack: [number, number]; defense: [number, number] }> = {
  Warrior: { hp: [120, 12], mp: [30, 2], attack: [12, 2], defense: [6, 1] },
  Archer: { hp: [90, 9], mp: [40, 3], attack: [14, 3], defense: [4, 1] },
  Mage: { hp: [80, 8], mp: [70, 6], attack: [15, 3], defense: [3, 1] },
};

export function 직업스탯(직업: 직업, 레벨: number): 스탯 {
  const 줄 = 직업표[직업];
  const 값 = ([처음, 늘어남]: [number, number]): number => 처음 + 늘어남 * (레벨 - 1);
  return { maxHp: 값(줄.hp), maxMp: 값(줄.mp), attack: 값(줄.attack), defense: 값(줄.defense) };
}

export function 스탯글(s: 스탯): string {
  return `HP ${String(s.maxHp)} · MP ${String(s.maxMp)} · 공격력 ${String(s.attack)} · 방어력 ${String(s.defense)}`;
}

export function 거리(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function 배율범위안(데미지: number, 공격력: number, 방어력: number, 배율: number): boolean {
  const 기준 = Math.max(1, 공격력 - 방어력 / 2) * 배율;
  return 데미지 >= Math.floor(기준 * 0.9) && 데미지 <= Math.ceil(기준 * 1.1);
}

export async function 게임숫자(game: GameDriver, 주소: string, 칸: string): Promise<number> {
  const 값 = await game.get(주소, 칸);
  if (typeof 값 !== 'number') throw new Error(`${주소} 의 ${칸} 이 숫자가 아니다: ${JSON.stringify(값)}`);
  return 값;
}

export async function 게임위치(game: GameDriver, 주소: string): Promise<{ x: number; z: number }> {
  const 값 = await game.get(주소, 'Transform.position');
  const 칸 = 값 as { x?: unknown; z?: unknown } | null;
  if (칸 === null || typeof 칸.x !== 'number' || typeof 칸.z !== 'number') throw new Error(`${주소} 의 위치가 x · z 숫자가 아니다: ${JSON.stringify(값)}`);
  return { x: 칸.x, z: 칸.z };
}

export async function 소모품줄(admin: APIRequestContext, 누구: 캐릭터, 목록: 상점줄[], templateId: string): Promise<string> {
  const 받음 = await 하나받기(admin, 누구, templateId);
  const 사용 = await 아이템사용(admin, 누구, 받음.id);
  let 종류: string;
  let 회복: string;
  if (사용.ok()) {
    const 몸 = await 응답몸<{ healHp: number; healMp: number }>(사용);
    종류 = '소모품';
    회복 = `HP ${String(몸.healHp)} · MP ${String(몸.healMp)}`;
  } else {
    종류 = (await 오류코드(사용)) === 'NOT_USABLE' ? '주문서' : `사용 실패 ${String(사용.status())}`;
    회복 = '없음';
  }
  const 구매가 = 목록.find((x) => x.templateId === templateId)?.price;
  return `종류 ${종류} · 구매가 ${구매가 === undefined ? '-' : String(구매가)} · 판매가 ${String(받음.sellPrice)} · 회복 ${회복}`;
}

function 상점칸(목록: 상점줄[], templateId: string): { 구매가: string; 상점: string } {
  const 줄 = 목록.find((x) => x.templateId === templateId);
  return { 구매가: 줄 === undefined ? '-' : String(줄.price), 상점: 줄 === undefined ? 'X' : 'O' };
}

export async function 무기줄(admin: APIRequestContext, 누구: 캐릭터, 목록: 상점줄[], templateId: string, 맨손공격력: number): Promise<string> {
  const 받음 = await 새아이템주기(admin, 누구, templateId);
  const 끼운 = await 장착(admin, 누구, 받음.id);
  const 칸 = 상점칸(목록, templateId);
  return `공격력 ${String(끼운.stats.attack - 맨손공격력)} · 구매가 ${칸.구매가} · 판매가 ${String(받음.sellPrice)} · 상점 ${칸.상점}`;
}

export async function 방어구줄(admin: APIRequestContext, 누구: 캐릭터, 목록: 상점줄[], templateId: string, 맨몸방어력: number): Promise<string> {
  const 받음 = await 새아이템주기(admin, 누구, templateId);
  const 끼운 = await 장착(admin, 누구, 받음.id);
  await 장비해제(admin, 누구, 받음.id);
  const 칸 = 상점칸(목록, templateId);
  return `방어력 ${String(끼운.stats.defense - 맨몸방어력)} · 구매가 ${칸.구매가} · 판매가 ${String(받음.sellPrice)} · 상점 ${칸.상점}`;
}
