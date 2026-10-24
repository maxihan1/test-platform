import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CaseBodyArgs, GameDriver } from '@platform/kit';

import { type 가방, type 강화결과, type 구역, type 능력치, 머리, 본문, type 봇, type 스폰, type 아이템, 인증머리, 찾기, type 캐릭터, type 캐릭터정보 } from './api.helper.js';
import { 가방읽기, 구역자리, 봇읽기, 살아있는봇, 새캐릭터, type 설정, 설정읽기, 순간이동, 스폰앞으로, 스폰찾기, 아이템주기, 아이템지우기, type 어드민캐릭터, 캐릭터읽기 } from './game-state.helper.js';

type 앱 = CaseBodyArgs<unknown, unknown>['driver'];

export interface 장비응답 {
  inventory: 가방;
  stats: 능력치;
}

export interface 사용응답 {
  templateId: string;
  healHp: number;
  healMp: number;
  inventory: 가방;
}

export interface 강화응답 {
  result: 강화결과;
  item: 아이템 | null;
  fromLevel: number;
  toLevel: number;
  goldSpent: number;
  inventory: 가방;
}

export interface 강화기록 {
  id: number;
  itemId: number;
  templateId: string;
  fromLevel: number;
  toLevel: number;
  result: 강화결과;
  goldCost: number;
  createdAt: string;
}

export interface 어드민계정 {
  id: number;
  username: string;
  createdAt: string;
  characterCount: number;
}

export interface 정리응답 {
  accountsDeleted: number;
  charactersDeleted: number;
}

export interface PK기록 {
  killerKind: string;
  killerName: string | null;
  victimKind: string;
  victimName: string | null;
  victimWasInnocent: boolean;
  alignmentDelta: number;
  createdAt: string;
}

export function 목록글(...값: string[]): string {
  return [...값].sort().join(', ');
}

export function 칸들(값: object): string {
  return 목록글(...Object.keys(값));
}

export function 목록칸들(목록: object[]): string {
  return [...new Set(목록.map((값) => 칸들(값)))].join(' | ');
}

export function 랜덤글(길이: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + 길이)
    .padEnd(길이, 'x');
}

export async function 될때까지(읽기: () => Promise<boolean>, 한도: number, 무엇: string): Promise<void> {
  const 끝 = Date.now() + 한도;
  for (;;) {
    if (await 읽기()) return;
    if (Date.now() >= 끝) throw new Error(`${무엇}이 ${String(한도 / 1000)}초 안에 되지 않았다`);
    await new Promise((깨운다) => setTimeout(깨운다, 500));
  }
}

export async function 새캐릭터자리(admin: APIRequestContext, 앞머리: string, 어디: 구역 = 'Town'): Promise<캐릭터> {
  const 만든 = await 새캐릭터(admin, 앞머리);
  await 순간이동(admin, 만든, 어디);
  return 만든;
}

export async function 내정보(request: APIRequestContext, 누구: 캐릭터): Promise<캐릭터정보> {
  return 본문(await request.get(`/characters/${String(누구.번호)}`, { headers: 인증머리(누구) }), '캐릭터 정보');
}

export async function 내가방(request: APIRequestContext, 누구: 캐릭터): Promise<가방> {
  return 본문(await request.get(`/characters/${String(누구.번호)}/inventory`, { headers: 인증머리(누구) }), '가방');
}

export async function 쓰기(request: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<APIResponse> {
  return request.post(`/characters/${String(누구.번호)}/use-item`, { headers: 인증머리(누구), data: { itemId: 아이템번호 } });
}

export function 아이템번호(가방값: 가방, templateId: string): number {
  const 찾은 = 찾기(가방값, templateId);
  if (찾은 === undefined) throw new Error(`가방에 ${templateId} 가 없다`);
  return 찾은.id;
}

export async function 물약만남기기(admin: APIRequestContext, 누구: 캐릭터, 개수: number): Promise<가방> {
  const 지금 = await 가방읽기(admin, 누구);
  await 아이템지우기(admin, 누구, 아이템번호(지금, 'potion_hp_s'));
  return 아이템주기(admin, 누구, 'potion_hp_s', { 수량: 개수 });
}

export async function 삭제포함찾기(admin: APIRequestContext, 이름: string): Promise<어드민캐릭터[]> {
  return 본문(await admin.get(`/admin/characters?name=${encodeURIComponent(이름)}&includeDeleted=true`), '지운 것까지 캐릭터 찾기');
}

export async function 계정찾기(admin: APIRequestContext, 앞머리: string): Promise<어드민계정[]> {
  return 본문(await admin.get(`/admin/accounts?prefix=${encodeURIComponent(앞머리)}`), '계정 찾기');
}

export async function 정리부르기(admin: APIRequestContext, 앞머리: string): Promise<APIResponse> {
  return admin.post('/admin/cleanup', { data: { usernamePrefix: 앞머리 } });
}

export async function 정리하기(admin: APIRequestContext, 앞머리: string): Promise<정리응답> {
  return 본문(await 정리부르기(admin, 앞머리), '정리');
}

export async function 결과고정읽기(admin: APIRequestContext): Promise<설정['forced']> {
  return 본문(await admin.get('/admin/forced'), '결과 고정 읽기');
}

export async function GM설정읽기(request: APIRequestContext, 누구: 캐릭터): Promise<Pick<설정, 'enhance' | 'drop'>> {
  return 본문(await request.get('/gm/config', { headers: 머리(누구) }), 'GM 설정');
}

export async function 상점사기(request: APIRequestContext, 누구: 캐릭터, templateId: string, 수량: number): Promise<가방> {
  return 본문(await request.post('/shop/buy', { headers: 머리(누구), data: { templateId, quantity: 수량 } }), '상점 구매');
}

export async function 상점팔기(request: APIRequestContext, 누구: 캐릭터, 아이템번호값: number, 수량: number): Promise<가방> {
  return 본문(await request.post('/shop/sell', { headers: 머리(누구), data: { itemId: 아이템번호값, quantity: 수량 } }), '상점 판매');
}

export async function 물약사고팔기(request: APIRequestContext, 누구: 캐릭터): Promise<void> {
  const 산 = await 상점사기(request, 누구, 'potion_hp_s', 1);
  await 상점팔기(request, 누구, 아이템번호(산, 'potion_hp_s'), 1);
}

export async function 강화하기(request: APIRequestContext, 누구: 캐릭터, 아이템번호값: number, 주문서번호: number): Promise<강화응답> {
  return 본문(await request.post('/enhance', { headers: 머리(누구), data: { itemId: 아이템번호값, scrollId: 주문서번호 } }), '강화');
}

export async function 강화기록읽기(admin: APIRequestContext, 누구: { 번호: number }): Promise<강화기록[]> {
  return 본문(await admin.get(`/admin/characters/${String(누구.번호)}/enhance-history`), '강화 기록');
}

export async function PK기록읽기(admin: APIRequestContext, 누구: { 번호: number }): Promise<PK기록[]> {
  return 본문(await admin.get(`/admin/pk-records?characterId=${String(누구.번호)}`), 'PK 기록');
}

export async function 몬스터처치(request: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터): Promise<{ goldGained: number }> {
  const 스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
  await 스폰앞으로(admin, 누구, 스폰값);
  return 본문(
    await request.post('/combat/monster-kill', { headers: 머리(누구), data: { monsterId: 'Imp', spawnId: 스폰값.id, x: 스폰값.x, z: 스폰값.z } }),
    '몬스터 처치',
  );
}

export async function 봇처치(request: APIRequestContext, 누구: 캐릭터, 봇번호: number): Promise<APIResponse> {
  return request.post('/combat/bot-kill', { headers: 머리(누구), data: { botId: 봇번호, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z } });
}

export async function 죽은봇만들기(request: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터): Promise<봇> {
  const 봇값 = await 살아있는봇(admin, 누구, 'Beginner');
  await 본문(await 봇처치(request, 누구, 봇값.id), '봇 처치');
  return 봇읽기(admin, 누구, 봇값.id);
}

export async function 선공표시하기(request: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터): Promise<void> {
  const 봇값 = await 살아있는봇(admin, 누구, 'Beginner', 'Innocent');
  await 본문(
    await request.post('/combat/pk-attack', {
      headers: 머리(누구),
      data: { attackerKind: 'Character', attackerId: 누구.번호, targetKind: 'Bot', targetId: 봇값.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
    }),
    '선공 표시 만들기',
  );
}

export async function 스폰바꾸기(admin: APIRequestContext, 번호: string, 값: Pick<스폰, 'zone' | 'monster' | 'x' | 'z'>): Promise<APIResponse> {
  return admin.put(`/admin/spawns/${encodeURIComponent(번호)}`, { data: 값 });
}

export async function 스폰지우기(admin: APIRequestContext, 번호: string): Promise<{ count: number }> {
  return 본문(await admin.delete(`/admin/spawns/${encodeURIComponent(번호)}`), '스폰 지우기');
}

export function 확률줄글(표: 설정['enhance'], 목표: number): string {
  const 줄 = 표.rates.find((r) => r.targetLevel === 목표);
  return 줄 === undefined ? '없음' : `${String(줄.success)} · ${String(줄.fail)} · ${String(줄.destroy)}`;
}

export function 확률퍼센트(표: 설정['enhance'], 목표: number): { 성공: number; 실패: number; 파괴: number } | null {
  const 줄 = 표.rates.find((r) => r.targetLevel === 목표);
  return 줄 === undefined ? null : { 성공: Math.round(줄.success * 100), 실패: Math.round(줄.fail * 100), 파괴: Math.round(줄.destroy * 100) };
}

export async function 서버자리옮겨질때까지(admin: APIRequestContext, 누구: { 번호: number }, 처음: { x: number; z: number }, 한도 = 20_000): Promise<void> {
  await 될때까지(
    async () => {
      const 지금 = (await 캐릭터읽기(admin, 누구)).position;
      return 지금.x !== 처음.x || 지금.z !== 처음.z;
    },
    한도,
    '서버가 받은 캐릭터 자리가 바뀌는 일',
  );
}

export async function 서버다시켜질때까지(admin: APIRequestContext, 한도: number, 다시켜졌나: (설정값: 설정) => boolean): Promise<void> {
  const 끝 = Date.now() + 한도;
  let 마지막 = '';
  for (;;) {
    try {
      if (다시켜졌나(await 설정읽기(admin))) return;
      마지막 = '설정이 아직 그대로다';
    } catch (e) {
      마지막 = e instanceof Error ? e.message : String(e);
    }
    if (Date.now() >= 끝) throw new Error(`서버가 ${String(한도 / 1000)}초 안에 다시 켜지지 않았다 (마지막: ${마지막})`);
    await new Promise((깨운다) => setTimeout(깨운다, 1000));
  }
}

export async function 앱다시켜기(driver: 앱, game: GameDriver): Promise<void> {
  const 앱이름 = await driver.getCurrentPackage();
  await driver.terminateApp(앱이름);
  await driver.activateApp(앱이름);
  await game.waitForValue('Subtitle', 'Text.text', '애쉬베일', { timeoutMs: 120_000 });
}
