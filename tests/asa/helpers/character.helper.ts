import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 새캐릭터이름, 캐릭터만들기, type 가방, type 아이템 } from './game.helper.js';

export async function 막힐때까지캐릭터만들기(request: APIRequestContext, 토큰: string, 상한: number): Promise<APIResponse | undefined> {
  let 마지막: APIResponse | undefined;
  for (let i = 0; i < 상한; i += 1) {
    마지막 = await 캐릭터만들기(request, 토큰);
    if (마지막.status() !== 201) return 마지막;
  }
  return 마지막;
}

export function 길이별캐릭터이름(길이: number): string {
  return 길이 <= 0 ? '' : 새캐릭터이름(길이);
}

export function 장착장비수(지금: 가방): number {
  return 지금.items.filter((i) => i.equippedSlot !== null).length;
}

export function 장착중인가(아이템: 아이템 | undefined): boolean {
  return 아이템 !== undefined && 아이템.equippedSlot !== null;
}
