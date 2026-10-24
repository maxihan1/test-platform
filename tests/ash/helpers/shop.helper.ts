import type { APIRequestContext, APIResponse } from '@playwright/test';

import { type 가방, 가방받기, type 강화결과, type 능력치, 머리, 본문, type 아이템, 오류, 장착하기, 찾기, type 캐릭터, 캐릭터정보받기, 해제하기 } from './api.helper.js';
import { 가방읽기, 골드주기, 새캐릭터, 아이템주기, 아이템지우기 } from './game-state.helper.js';

export interface 상점목록 {
  priceMultiplier: number;
  items: { templateId: string; price: number }[];
}

export interface 강화응답 {
  result: 강화결과;
  item: 아이템 | null;
  fromLevel: number;
  toLevel: number;
  goldSpent: number;
  inventory: 가방;
}

export interface 장착응답 {
  inventory: 가방;
  stats: 능력치;
}

export interface 서버표행 {
  상점: boolean;
  구매가: number | null;
  판매가: number | null;
}

export interface 강화분포 {
  성공: number;
  실패: number;
  파괴: number;
}

export interface 템플릿 {
  id: string;
  name: string;
  type: string;
}

const 결과이름: Record<강화결과, keyof 강화분포> = { Success: '성공', Fail: '실패', Destroy: '파괴' };

export async function 상점목록받기(요청: APIRequestContext, 누구: 캐릭터): Promise<상점목록> {
  return 본문<상점목록>(await 요청.get('/shop/items', { headers: 머리(누구) }), '상점 목록 받기');
}

export async function 템플릿받기(admin: APIRequestContext): Promise<템플릿[]> {
  return 본문<템플릿[]>(await admin.get('/admin/item-templates'), '아이템 템플릿 받기');
}

export async function 구매하기(요청: APIRequestContext, 누구: 캐릭터, templateId: string, 수량 = 1): Promise<APIResponse> {
  return 요청.post('/shop/buy', { headers: 머리(누구), data: { templateId, quantity: 수량 } });
}

export async function 판매하기(요청: APIRequestContext, 누구: 캐릭터, 아이템번호: number, 수량 = 1): Promise<APIResponse> {
  return 요청.post('/shop/sell', { headers: 머리(누구), data: { itemId: 아이템번호, quantity: 수량 } });
}

export async function 강화요청(요청: APIRequestContext, 누구: 캐릭터, 아이템번호: number, 주문서번호: number): Promise<APIResponse> {
  return 요청.post('/enhance', { headers: 머리(누구), data: { itemId: 아이템번호, scrollId: 주문서번호 } });
}

export async function 땅아이템목록(요청: APIRequestContext, 누구: 캐릭터, 어디: string): Promise<{ id: number }[]> {
  return 본문<{ id: number }[]>(await 요청.get(`/world/ground-items?zone=${어디}`, { headers: 머리(누구) }), '바닥 아이템 목록 받기');
}

export async function 땅아이템줍기(요청: APIRequestContext, 누구: 캐릭터, 바닥번호: number, 자리: { x: number; z: number }): Promise<APIResponse> {
  return 요청.post(`/world/ground-items/${String(바닥번호)}/pickup`, { headers: 머리(누구), data: { x: 자리.x, z: 자리.z } });
}

export async function 오류코드(res: APIResponse): Promise<string> {
  return (await 오류(res)).code;
}

export async function 새골드캐릭터(admin: APIRequestContext, 앞머리: string, 골드: number): Promise<캐릭터> {
  const 누구 = await 새캐릭터(admin, 앞머리);
  await 골드주기(admin, 누구, 골드);
  return 누구;
}

export async function 표읽기(요청: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터, 번호들: string[]): Promise<Record<string, 서버표행>> {
  const 템플릿들 = await 템플릿받기(admin);
  for (const 번호 of 번호들) {
    if (템플릿들.some((t) => t.id === 번호)) await 아이템주기(admin, 누구, 번호);
  }
  const 가방값 = await 가방받기(요청, 누구);
  const 목록 = await 상점목록받기(요청, 누구);
  return Object.fromEntries(
    번호들.map((번호): [string, 서버표행] => {
      const 줄 = 목록.items.find((i) => i.templateId === 번호);
      return [번호, { 상점: 줄 !== undefined, 구매가: 줄?.price ?? null, 판매가: 찾기(가방값, 번호)?.sellPrice ?? null }];
    }),
  );
}

async function 가져오기(admin: APIRequestContext, 누구: 캐릭터, 번호: string): Promise<아이템> {
  const 있는 = 찾기(await 가방읽기(admin, 누구), 번호);
  if (있는 !== undefined) return 있는;
  const 준 = 찾기(await 아이템주기(admin, 누구, 번호), 번호);
  if (준 === undefined) throw new Error(`${번호} 를 가방에 넣지 못했다`);
  return 준;
}

async function 맨몸능력(요청: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터): Promise<능력치> {
  const 입은것들 = (await 가방읽기(admin, 누구)).items.filter((i) => i.equippedSlot !== null);
  for (const 칸 of 입은것들) await 본문(await 해제하기(요청, 누구, 칸.id), '장비 해제');
  return (await 캐릭터정보받기(요청, 누구)).stats;
}

export async function 장비수치읽기(
  요청: APIRequestContext,
  admin: APIRequestContext,
  후보들: 캐릭터[],
  번호: string,
  어느: '공격력' | '방어력',
): Promise<number> {
  const 키 = 어느 === '공격력' ? 'attack' : 'defense';
  for (const 누구 of 후보들) {
    const 장비 = await 가져오기(admin, 누구, 번호);
    const 맨몸 = await 맨몸능력(요청, admin, 누구);
    const 장착 = await 장착하기(요청, 누구, 장비.id);
    if (장착.status() === 409) continue;
    const 입은 = await 본문<장착응답>(장착, '장비 장착');
    await 본문(await 해제하기(요청, 누구, 장비.id), '장비 해제');
    return 입은.stats[키] - 맨몸[키];
  }
  throw new Error(`${번호} 를 장착할 수 있는 직업이 없다`);
}

export async function 강화일꾼만들기(
  admin: APIRequestContext,
  앞머리: string,
  명수: number,
  채울것: { 주문서: number; 골드: number },
  담을곳: 캐릭터[],
): Promise<void> {
  await Promise.all(
    Array.from({ length: 명수 }, async (_, 순서) => {
      const 누구 = await 새캐릭터(admin, `${앞머리}${String(순서)}`);
      담을곳.push(누구);
      await 골드주기(admin, 누구, 채울것.골드);
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 채울것.주문서 });
    }),
  );
}

async function 강화돌리기(
  요청: APIRequestContext,
  admin: APIRequestContext,
  누구: 캐릭터,
  횟수: number,
  시작수치: (번째: number) => number,
): Promise<강화분포> {
  const 셈: 강화분포 = { 성공: 0, 실패: 0, 파괴: 0 };
  const 주문서 = 찾기(await 가방읽기(admin, 누구), 'scroll_weapon');
  if (주문서 === undefined) throw new Error('무기 강화 주문서가 가방에 없다');
  let 칼번호: number | null = null;
  for (let 번째 = 0; 번째 < 횟수; 번째 += 1) {
    if (칼번호 === null) {
      const 칼 = 찾기(await 아이템주기(admin, 누구, 'sword_long', { 강화: 시작수치(번째) }), 'sword_long');
      if (칼 === undefined) throw new Error('롱 소드를 가방에 넣지 못했다');
      칼번호 = 칼.id;
    }
    const 응답 = await 본문<강화응답>(await 강화요청(요청, 누구, 칼번호, 주문서.id), '강화');
    셈[결과이름[응답.result]] += 1;
    if (응답.result === 'Fail') continue;
    if (응답.result === 'Success') await 아이템지우기(admin, 누구, 칼번호);
    칼번호 = null;
  }
  return 셈;
}

export async function 강화분포모으기(
  요청: APIRequestContext,
  admin: APIRequestContext,
  일꾼들: 캐릭터[],
  시도: number,
  시작수치: (번째: number) => number,
): Promise<강화분포> {
  const 조각들 = await Promise.all(
    일꾼들.map((누구, 순서) => 강화돌리기(요청, admin, 누구, Math.floor(시도 / 일꾼들.length) + (순서 < 시도 % 일꾼들.length ? 1 : 0), 시작수치)),
  );
  return 조각들.reduce((합, 조각) => ({ 성공: 합.성공 + 조각.성공, 실패: 합.실패 + 조각.실패, 파괴: 합.파괴 + 조각.파괴 }), { 성공: 0, 실패: 0, 파괴: 0 });
}
