import type { APIRequestContext, APIResponse } from '@playwright/test';

import {
  가방,
  산봇들,
  스폰목록,
  아이템주기,
  응답몸,
  장비빼고비우기,
  플레이어머리,
  type 가방정보,
  type 구역,
  type 바닥아이템정보,
  type 봇정보,
  type 스폰정보,
  type 캐릭터,
} from './game-state.helper.js';

export async function 상점목록(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get('/shop/items', { headers: 플레이어머리(누구) });
}

export async function 상점사기(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 수량: number): Promise<APIResponse> {
  return admin.post('/shop/buy', { headers: 플레이어머리(누구), data: { templateId, quantity: 수량 } });
}

export async function 상점팔기(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number, 수량: number): Promise<APIResponse> {
  return admin.post('/shop/sell', { headers: 플레이어머리(누구), data: { itemId: 아이템번호, quantity: 수량 } });
}

export async function 장착해제(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return admin.post(`/characters/${String(누구.id)}/unequip`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } });
}

export async function 장비모두해제(admin: APIRequestContext, 누구: 캐릭터): Promise<void> {
  for (const 아이템 of (await 가방(admin, 누구)).items.filter((x) => x.equippedSlot !== null)) {
    const 응답 = await 장착해제(admin, 누구, 아이템.id);
    if (!응답.ok()) throw new Error(`${누구.이름} 아이템 ${String(아이템.id)} 장착 해제 실패: ${String(응답.status())} ${await 응답.text()}`);
  }
}

export async function 수량주기(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 수량: number): Promise<가방정보> {
  let 지금 = await 가방(admin, 누구);
  for (let 남음 = 수량; 남음 > 0; 남음 -= 999) {
    지금 = await 아이템주기(admin, 누구, templateId, { 수량: Math.min(999, 남음) });
  }
  return 지금;
}

export async function 물약만가지기(admin: APIRequestContext, 누구: 캐릭터, 수량: number): Promise<가방정보> {
  await 장비빼고비우기(admin, 누구);
  return 수량주기(admin, 누구, 'potion_hp_s', 수량);
}

export function 개수(지금: 가방정보, templateId: string): number {
  return 지금.items.filter((x) => x.templateId === templateId).reduce((합, x) => 합 + x.quantity, 0);
}

export function 칸들(지금: 가방정보, templateId: string): string {
  return 지금.items
    .filter((x) => x.templateId === templateId)
    .map((x) => x.quantity)
    .sort((a, b) => b - a)
    .join(', ');
}

export function 칸나누기(합: number): string {
  const 칸: number[] = [];
  for (let 남음 = 합; 남음 > 0; 남음 -= 999) 칸.push(Math.min(999, 남음));
  return 칸.join(', ');
}

export async function 성향바꾸기시도(admin: APIRequestContext, 누구: 캐릭터, 값: number): Promise<APIResponse> {
  return admin.patch(`/admin/characters/${String(누구.id)}`, { data: { alignment: 값 } });
}

export async function 바닥아이템목록(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역): Promise<바닥아이템정보[]> {
  return 응답몸<바닥아이템정보[]>(await admin.get(`/world/ground-items?zone=${곳}`, { headers: 플레이어머리(누구) }));
}

export async function 선량한봇하나(admin: APIRequestContext, 누구: 캐릭터, 순번 = 0): Promise<봇정보 | undefined> {
  const 봇들 = await 산봇들(admin, 누구, 'Beginner', 'Innocent');
  return 봇들[Math.max(0, 봇들.length - 1 - 순번)];
}

export async function 임프스폰(admin: APIRequestContext): Promise<스폰정보 | undefined> {
  return (await 스폰목록(admin)).find((x) => x.monster === 'Imp' && x.zone !== 'Town');
}
