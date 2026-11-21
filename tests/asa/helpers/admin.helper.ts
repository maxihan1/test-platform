import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 무작위글자 } from './api.helper.js';
import { 값읽기, type 가방, type 스폰, type 캐릭터 } from './game.helper.js';

export interface 원장줄 {
  id: number;
  delta: number;
  reason: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface 고정결과 {
  enhance: string[];
  botLoot: boolean[];
  deathDrop: boolean[];
}

export interface 어드민캐릭터요약 {
  id: number;
  gold: number;
  level: number;
  alignment: number;
  zone: string;
}

export async function 어드민부르기(admin: APIRequestContext, 방식: string, 경로: string, 본문?: unknown): Promise<APIResponse> {
  return admin.fetch(경로, {
    method: 방식,
    ...(본문 === undefined ? {} : { data: 본문 }),
  });
}

export async function 어드민캐릭터고치기(admin: APIRequestContext, 번호: number, 본문: Record<string, unknown>): Promise<APIResponse> {
  return 어드민부르기(admin, 'PATCH', `/admin/characters/${번호}`, 본문);
}

export async function 어드민캐릭터읽기(admin: APIRequestContext, 번호: number): Promise<캐릭터> {
  return 값읽기<캐릭터>(await 어드민부르기(admin, 'GET', `/admin/characters/${번호}`));
}

export async function 어드민초기화(admin: APIRequestContext, 번호: number): Promise<APIResponse> {
  return 어드민부르기(admin, 'POST', `/admin/characters/${번호}/reset`);
}

export async function 어드민가방읽기(admin: APIRequestContext, 번호: number): Promise<가방> {
  return 값읽기<가방>(await 어드민부르기(admin, 'GET', `/admin/characters/${번호}/inventory`));
}

export async function 어드민아이템주기(admin: APIRequestContext, 번호: number, 템플릿: string, 수량 = 1, 강화수치 = 0): Promise<APIResponse> {
  return 어드민부르기(admin, 'POST', `/admin/characters/${번호}/items`, {
    templateId: 템플릿,
    quantity: 수량,
    enhanceLevel: 강화수치,
  });
}

export async function 어드민원장읽기(admin: APIRequestContext, 번호: number, 한도 = 100): Promise<원장줄[]> {
  return 값읽기<원장줄[]>(await 어드민부르기(admin, 'GET', `/admin/characters/${번호}/ledger?limit=${한도}`));
}

export async function 어드민요약읽기(admin: APIRequestContext, 번호: number): Promise<어드민캐릭터요약> {
  return 값읽기<어드민캐릭터요약>(await 어드민부르기(admin, 'GET', `/admin/characters/${번호}/summary`));
}

export async function 결과고정넣기(admin: APIRequestContext, 강화결과: string[]): Promise<APIResponse> {
  return 어드민부르기(admin, 'POST', '/admin/forced', { enhance: 강화결과 });
}

export async function 결과고정읽기(admin: APIRequestContext): Promise<고정결과> {
  return 값읽기<고정결과>(await 어드민부르기(admin, 'GET', '/admin/forced'));
}

export async function 결과고정비우기(admin: APIRequestContext): Promise<APIResponse> {
  return 어드민부르기(admin, 'DELETE', '/admin/forced');
}

export async function 남은강화고정비우기(admin: APIRequestContext): Promise<void> {
  if ((await 결과고정읽기(admin)).enhance.length > 0) await 결과고정비우기(admin);
}

export function 새스폰번호(): string {
  return `ASAT-${무작위글자(8).toUpperCase()}`;
}

export async function 스폰목록(admin: APIRequestContext): Promise<스폰[]> {
  return 값읽기<스폰[]>(await 어드민부르기(admin, 'GET', '/admin/spawns'));
}

export async function 스폰있나(admin: APIRequestContext, 번호: string): Promise<boolean> {
  return (await 스폰목록(admin)).some((s) => s.id === 번호);
}

export async function 스폰고치기(
  admin: APIRequestContext,
  번호: string,
  본문: { zone: string; monster: string; x: number; z: number },
): Promise<APIResponse> {
  return 어드민부르기(admin, 'PUT', `/admin/spawns/${번호}`, 본문);
}

export async function 스폰지우기(admin: APIRequestContext, 번호: string): Promise<APIResponse> {
  return 어드민부르기(admin, 'DELETE', `/admin/spawns/${번호}`);
}

export async function 계정목록(admin: APIRequestContext, 앞머리: string, 한도 = 5): Promise<APIResponse> {
  return 어드민부르기(admin, 'GET', `/admin/accounts?prefix=${encodeURIComponent(앞머리)}&limit=${한도}`);
}

export async function 앞머리계정수(admin: APIRequestContext, 앞머리: string): Promise<number> {
  return (await 값읽기<unknown[]>(await 계정목록(admin, 앞머리, 1))).length;
}

export async function 빈앞머리찾기(admin: APIRequestContext, 길이: number): Promise<string> {
  let 앞머리 = 무작위글자(길이);
  for (let i = 0; i < 30 && (await 앞머리계정수(admin, 앞머리)) > 0; i += 1) 앞머리 = 무작위글자(길이);
  return 앞머리;
}

export async function 어드민정리(admin: APIRequestContext, 앞머리: string): Promise<APIResponse> {
  return 어드민부르기(admin, 'POST', '/admin/cleanup', {
    usernamePrefix: 앞머리,
  });
}
