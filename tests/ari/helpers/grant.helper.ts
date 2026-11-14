import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 계정번호찾기, 본문JSON, 지급정리, 캐릭터번호찾기 } from './api.helper.js';

export interface 아이템흐름기록 {
  id: number;
  kind: string;
  itemName: string;
  quantity: number;
  currencyAmount: number;
  grantId: number | null;
}

export async function 두번째캐릭터번호(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 계정번호 = await 계정번호찾기(admin, 아이디);
  return 계정번호 > 0 ? 캐릭터번호찾기(admin, 계정번호) : 0;
}

export async function 성공이면지급정리(admin: APIRequestContext, 응답: APIResponse): Promise<void> {
  if (응답.ok()) await 지급정리(admin, (await 본문JSON<{ id: number }>(응답)).id);
}

export function 길이글(길이: number): string {
  if (길이 < 6) return '가'.repeat(길이);
  return `[QA] ${'가'.repeat(길이 - 5)}`;
}

export function 아이템종류들(종수: number): { itemName: string; quantity: number }[] {
  return Array.from({ length: 종수 }, (_, i) => ({ itemName: `[QA] 시험 아이템 ${i + 1}`, quantity: 1 }));
}

export function 같은번호들(캐릭터번호: number, 개수: number): number[] {
  return Array.from({ length: 개수 }, () => 캐릭터번호);
}

export async function 지급기록찾기(admin: APIRequestContext, 캐릭터번호: number, 지급번호: number): Promise<아이템흐름기록 | null> {
  for (let 회 = 0; 회 < 10; 회 += 1) {
    const 응답 = await admin.get('/opsapi/logs/items', { params: { kind: 'GRANTED', characterId: 캐릭터번호, size: 200 } });
    if (응답.ok()) {
      const 몸 = await 본문JSON<{ items: 아이템흐름기록[] }>(응답);
      const 찾음 = 몸.items.find((x) => x.grantId === 지급번호);
      if (찾음 !== undefined) return 찾음;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}
