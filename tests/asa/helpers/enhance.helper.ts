import type { APIRequestContext } from '@playwright/test';

import { GM골드, GM설정, GM아이템, 강화, 값읽기, 장비다해제, 장착, type 가방, type 아이템, type 플레이어 } from './game.helper.js';

export interface 상점응답 {
  priceMultiplier: number;
  items: { templateId: string; price: number }[];
}

export interface 강화응답 {
  result: string;
  item: 아이템 | null;
  fromLevel: number;
  toLevel: number;
  goldSpent: number;
  inventory: 가방;
}

export interface 강화재료 {
  검번호: number;
  주문서번호: number;
}

export interface 반복결과 {
  결과: string;
  시도: number;
  아이템번호: number;
}

export interface 강화확률 {
  targetLevel: number;
  success: number;
  fail: number;
  destroy: number;
}

export async function 강화확률읽기(request: APIRequestContext, p: 플레이어, 목표레벨: number): Promise<강화확률 | undefined> {
  const 값 = await 값읽기<{ enhance?: { rates?: 강화확률[] } }>(await GM설정(request, p));
  return 값.enhance?.rates?.find((줄) => 줄.targetLevel === 목표레벨);
}

export const 기획서강화확률: 강화확률 = {
  targetLevel: 10,
  success: 0.1,
  fail: 0.5,
  destroy: 0.4,
};

export function 새아이템찾기(지금: 가방, 템플릿: string, 강화수치?: number): 아이템 | undefined {
  return (지금.items ?? [])
    .filter((i) => i.templateId === 템플릿 && (강화수치 === undefined || i.enhanceLevel === 강화수치))
    .sort((a, b) => b.id - a.id)[0];
}

async function 아홉짜리받기(request: APIRequestContext, p: 플레이어, 장착하기: boolean): Promise<number> {
  if (장착하기) await 장비다해제(request, p);
  const 지금 = await 값읽기<가방>(await GM아이템(request, p, 'sword_short', 1, 9));
  const 번호 = 새아이템찾기(지금, 'sword_short', 9)?.id ?? 0;
  if (장착하기 && 번호 > 0) await 장착(request, p, 번호);
  return 번호;
}

export async function 강화재료받기(request: APIRequestContext, p: 플레이어, 상한: number, 장착하기 = false): Promise<강화재료> {
  await GM골드(request, p, 상한 * 1000);
  const 주문서 = 새아이템찾기(await 값읽기<가방>(await GM아이템(request, p, 'scroll_weapon', 상한)), 'scroll_weapon');
  return {
    검번호: await 아홉짜리받기(request, p, 장착하기),
    주문서번호: 주문서?.id ?? 0,
  };
}

export async function 강화반복(
  request: APIRequestContext,
  p: 플레이어,
  재료: 강화재료,
  원하는결과: 'Fail' | 'Destroy',
  상한: number,
  장착하기 = false,
): Promise<반복결과> {
  let 검번호 = 재료.검번호;
  for (let 시도 = 1; 시도 <= 상한; 시도 += 1) {
    const 값 = await 값읽기<Partial<강화응답>>(await 강화(request, p, 검번호, 재료.주문서번호));
    if (값.result === 원하는결과) return { 결과: 값.result, 시도, 아이템번호: 검번호 };
    if (값.result !== 'Fail' && 시도 < 상한) 검번호 = await 아홉짜리받기(request, p, 장착하기);
  }
  return { 결과: '', 시도: 상한, 아이템번호: 검번호 };
}
