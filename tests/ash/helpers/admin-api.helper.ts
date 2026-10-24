import type { APIRequestContext, APIResponse } from '@playwright/test';

import {
  PK공격,
  봇처치,
  산봇들,
  월드다시두기,
  임의글자,
  플레이어머리,
  type 가방정보,
  type 강화확률,
  type 계정,
  type 구역,
  type 바닥아이템정보,
  type 봇정보,
  type 봇처치응답,
  type 성향,
  type 아이템,
  type 직업,
  type 캐릭터,
} from './game-state.helper.js';

async function 읽기<T>(res: APIResponse, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  const 글 = await res.text();
  return (글 === '' ? undefined : JSON.parse(글)) as T;
}

function 계정머리(누구: 계정): Record<string, string> {
  return { authorization: `Bearer ${누구.토큰}` };
}

export interface 원장줄 {
  id: number;
  reason: string;
  delta: number;
  balanceAfter: number;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
}

export interface 어드민캐릭터 {
  id: number;
  accountId: number;
  username: string;
  name: string;
  classType: 직업;
  level: number;
  exp: number;
  gold: number;
  x: number;
  z: number;
  zone: 구역;
  alignment: number;
  purpleUntil: string | null;
  pkKills: number;
  pkDeaths: number;
  createdAt: string;
  deleted: boolean;
}

export interface 계정줄 {
  id: number;
  username: string;
  createdAt: string;
  characterCount: number;
}

export interface 강화기록줄 {
  id: number;
  itemId: number;
  templateId: string;
  fromLevel: number;
  toLevel: number;
  result: string;
  goldCost: number;
  createdAt: string;
}

export interface PK기록줄 {
  killerKind: string;
  killerName: string;
  victimKind: string;
  victimName: string;
  victimWasInnocent: boolean;
  alignmentDelta: number;
}

export interface 템플릿줄 {
  id: string;
  name: string;
  type: string;
}

export interface GM설정묶음 {
  enhance: { rates: 강화확률[] };
  drop: { botLootChance: number };
}

export function 빠진키(몸: object, 키들: string[]): string {
  return 키들.filter((k) => !(k in 몸)).join(', ');
}

export function 빠진줄(목록: object[], 키들: string[]): string {
  return 목록
    .map((줄, i) => {
      const 빠짐 = 빠진키(줄, 키들);
      return 빠짐 === '' ? '' : `${String(i + 1)}번째 ${빠짐}`;
    })
    .filter((글) => 글 !== '')
    .join(' / ');
}

export function 거부됨(res: APIResponse): boolean {
  return res.status() >= 400 && res.status() < 500;
}

export function 장착중인가(지금: 가방정보, 아이템번호: number): boolean {
  return (지금.items.find((x) => x.id === 아이템번호)?.equippedSlot ?? null) !== null;
}

export function 새것찾기(앞: 가방정보, 뒤: 가방정보, templateId: string): 아이템 | undefined {
  const 앞번호 = new Set(앞.items.map((x) => x.id));
  return 뒤.items.find((x) => !앞번호.has(x.id) && x.templateId === templateId);
}

export function 정리앞머리(길이: number): string {
  let 둘째 = 임의글자(1);
  while (둘째 === 'q') 둘째 = 임의글자(1);
  return `z${둘째}${임의글자(Math.max(0, 길이 - 2))}`;
}

export async function 어드민열림(admin: APIRequestContext): Promise<number> {
  return (await admin.get('/admin/accounts?limit=1')).status();
}

export async function 내캐릭터목록(admin: APIRequestContext, 누구: 계정): Promise<{ id: number }[]> {
  return 읽기(await admin.get('/characters', { headers: 계정머리(누구) }), `${누구.아이디} 캐릭터 목록 읽기`);
}

export async function 캐릭터만들기응답(admin: APIRequestContext, 누구: 계정, 이름: string, 직업: 직업 = 'Warrior'): Promise<APIResponse> {
  return admin.post('/characters', { headers: 계정머리(누구), data: { name: 이름, classType: 직업, gender: 'Male' } });
}

export async function 캐릭터지우기응답(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.delete(`/characters/${String(누구.id)}`, { headers: 플레이어머리(누구) });
}

export async function 내캐릭터읽기(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get(`/characters/${String(누구.id)}`, { headers: 플레이어머리(누구) });
}

export async function 위치저장응답(admin: APIRequestContext, 누구: 캐릭터, 위치: { x: number; y: number; z: number }): Promise<APIResponse> {
  return admin.put(`/characters/${String(누구.id)}/position`, { headers: 플레이어머리(누구), data: 위치 });
}

export async function 내가방읽기(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get(`/characters/${String(누구.id)}/inventory`, { headers: 플레이어머리(누구) });
}

export async function 장착응답(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return admin.post(`/characters/${String(누구.id)}/equip`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } });
}

export async function 해제응답(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return admin.post(`/characters/${String(누구.id)}/unequip`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } });
}

export async function 물약쓰기응답(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return admin.post(`/characters/${String(누구.id)}/use-item`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } });
}

export async function PK기록읽기응답(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get(`/characters/${String(누구.id)}/pk-history`, { headers: 플레이어머리(누구) });
}

export async function 구매(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 수량 = 1): Promise<APIResponse> {
  return admin.post('/shop/buy', { headers: 플레이어머리(누구), data: { templateId, quantity: 수량 } });
}

export async function 판매(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number, 수량 = 1): Promise<APIResponse> {
  return admin.post('/shop/sell', { headers: 플레이어머리(누구), data: { itemId: 아이템번호, quantity: 수량 } });
}

export async function 스폰표읽기응답(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get('/world/spawns', { headers: 플레이어머리(누구) });
}

export async function 바닥목록(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역): Promise<바닥아이템정보[]> {
  return 읽기(await admin.get(`/world/ground-items?zone=${곳}`, { headers: 플레이어머리(누구) }), `${곳} 바닥 아이템 목록 읽기`);
}

export async function 내원장(admin: APIRequestContext, 누구: 캐릭터, 개수 = 50): Promise<원장줄[]> {
  return 읽기(await admin.get(`/currency/ledger?limit=${String(개수)}`, { headers: 플레이어머리(누구) }), `${누구.이름} 원장 읽기`);
}

export async function GM골드(admin: APIRequestContext, 누구: 캐릭터, amount: number): Promise<APIResponse> {
  return admin.post('/gm/gold', { headers: 플레이어머리(누구), data: { amount } });
}

export async function GM아이템(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 수량: number, 강화: number): Promise<APIResponse> {
  return admin.post('/gm/item', { headers: 플레이어머리(누구), data: { templateId, quantity: 수량, enhanceLevel: 강화 } });
}

export async function GM레벨(admin: APIRequestContext, 누구: 캐릭터, level: number): Promise<APIResponse> {
  return admin.post('/gm/level', { headers: 플레이어머리(누구), data: { level } });
}

export async function GM강화확률(admin: APIRequestContext, 누구: 캐릭터, 본문: { rates: 강화확률[] } | { reset: true }): Promise<APIResponse> {
  return admin.post('/gm/enhance-rate', { headers: 플레이어머리(누구), data: 본문 });
}

export async function GM봇다시두기(admin: APIRequestContext, 누구: 캐릭터, 곳?: 구역): Promise<APIResponse> {
  return admin.post('/gm/bot/reset', { headers: 플레이어머리(누구), data: 곳 === undefined ? {} : { zone: 곳 } });
}

export async function GM성향(admin: APIRequestContext, 누구: 캐릭터, value: number, clearPurple: boolean): Promise<APIResponse> {
  return admin.post('/gm/alignment', { headers: 플레이어머리(누구), data: { value, clearPurple } });
}

export async function GM드랍확률(admin: APIRequestContext, 누구: 캐릭터, 본문: { botLootChance: number } | { reset: true }): Promise<APIResponse> {
  return admin.post('/gm/drop-rate', { headers: 플레이어머리(누구), data: 본문 });
}

export async function GM설정읽기응답(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get('/gm/config', { headers: 플레이어머리(누구) });
}

export async function GM설정(admin: APIRequestContext, 누구: 캐릭터): Promise<GM설정묶음> {
  return 읽기(await GM설정읽기응답(admin, 누구), 'GM 설정 읽기');
}

export async function 계정찾기(admin: APIRequestContext, 앞머리: string, 개수 = 50): Promise<계정줄[]> {
  return 읽기(await admin.get(`/admin/accounts?prefix=${encodeURIComponent(앞머리)}&limit=${String(개수)}`), `${앞머리} 계정 찾기`);
}

export async function 어드민캐릭터들(
  admin: APIRequestContext,
  조건: { name?: string; accountId?: number; includeDeleted?: boolean; limit?: number },
): Promise<어드민캐릭터[]> {
  const 물음 = new URLSearchParams();
  if (조건.name !== undefined) 물음.set('name', 조건.name);
  if (조건.accountId !== undefined) 물음.set('accountId', String(조건.accountId));
  if (조건.includeDeleted !== undefined) 물음.set('includeDeleted', String(조건.includeDeleted));
  if (조건.limit !== undefined) 물음.set('limit', String(조건.limit));
  return 읽기(await admin.get(`/admin/characters?${물음.toString()}`), '어드민 캐릭터 찾기');
}

export async function 어드민요약(admin: APIRequestContext, 누구: 캐릭터): Promise<어드민캐릭터> {
  return 읽기(await admin.get(`/admin/characters/${String(누구.id)}/summary`), `${누구.이름} 요약 읽기`);
}

export async function 어드민원장(admin: APIRequestContext, 누구: 캐릭터, 개수 = 200): Promise<원장줄[]> {
  return 읽기(await admin.get(`/admin/characters/${String(누구.id)}/ledger?limit=${String(개수)}`), `${누구.이름} 어드민 원장 읽기`);
}

export async function 강화기록(admin: APIRequestContext, 누구: 캐릭터, 개수 = 50): Promise<강화기록줄[]> {
  return 읽기(await admin.get(`/admin/characters/${String(누구.id)}/enhance-history?limit=${String(개수)}`), `${누구.이름} 강화 기록 읽기`);
}

export async function PK기록들(admin: APIRequestContext, 캐릭터번호: number, 개수 = 50): Promise<PK기록줄[]> {
  return 읽기(await admin.get(`/admin/pk-records?characterId=${String(캐릭터번호)}&limit=${String(개수)}`), 'PK 기록 읽기');
}

export async function 아이템템플릿들(admin: APIRequestContext): Promise<템플릿줄[]> {
  return 읽기(await admin.get('/admin/item-templates'), '아이템 템플릿 읽기');
}

export async function 스폰넣기응답(admin: APIRequestContext, 번호: string, 값: { zone: 구역; monster: string; x: number; z: number }): Promise<APIResponse> {
  return admin.put(`/admin/spawns/${번호}`, { data: 값 });
}

export async function 스폰지우기응답(admin: APIRequestContext, 번호: string): Promise<APIResponse> {
  return admin.delete(`/admin/spawns/${번호}`);
}

export async function 정리응답(admin: APIRequestContext, 앞머리: string): Promise<APIResponse> {
  return admin.post('/admin/cleanup', { data: { usernamePrefix: 앞머리 } });
}

export async function 살아있는봇들(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역, 상태?: 성향['state'], 최소 = 1): Promise<봇정보[]> {
  let 산 = await 산봇들(admin, 누구, 곳, 상태);
  if (산.length < 최소) {
    await 월드다시두기(admin, 곳);
    산 = await 산봇들(admin, 누구, 곳, 상태);
  }
  if (산.length < 최소) throw new Error(`${곳} 에 살아 있는 ${상태 ?? ''} 봇이 ${String(최소)}마리 없다`);
  return [...산].sort(() => Math.random() - 0.5);
}

export async function 살아있는봇(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역, 상태?: 성향['state']): Promise<봇정보> {
  return (await 살아있는봇들(admin, 누구, 곳, 상태))[0]!;
}

export async function 봇하나처치(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역 = 'Beginner', 상태: 성향['state'] = 'Innocent'): Promise<봇처치응답> {
  for (let 시도 = 0; 시도 < 5; 시도 += 1) {
    const 봇 = await 살아있는봇(admin, 누구, 곳, 상태);
    const 응답 = await 봇처치(admin, 누구, 봇.id);
    if (응답.ok()) return 읽기<봇처치응답>(응답, `봇 ${봇.name} 처치`);
    if (응답.status() !== 409) throw new Error(`봇 ${봇.name} 처치 실패: ${String(응답.status())} ${await 응답.text()}`);
  }
  throw new Error('봇을 다섯 번 시도해도 처치하지 못했다');
}

export async function 선공표시만들기(admin: APIRequestContext, 누구: 캐릭터): Promise<void> {
  const 봇 = await 살아있는봇(admin, 누구, 'Beginner', 'Innocent');
  await 읽기(
    await PK공격(admin, 누구, { kind: 'Character', id: 누구.id }, { kind: 'Bot', id: 봇.id }),
    `${누구.이름} 이 선량한 봇 ${봇.name} 을 먼저 공격했다고 보고`,
  );
}
