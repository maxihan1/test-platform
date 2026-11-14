import type { APIRequestContext } from '@playwright/test';

import { 본문JSON } from './api.helper.js';
import { 고유캐릭터이름, 새아이템번호, 시험계정번호, 우편들지우기, 우편하나, 캐릭터들지우기, 캐릭터만들고번호, 데이터부르기 } from './data.helper.js';
import type { 저장행 } from './data.helper.js';

export interface 우편한통 {
  코드: number;
  id: number;
  캐릭터번호: number;
  저장글: string;
}

export interface 우편목록결과 {
  코드: number;
  몸: { mailMessages: 저장행[] } | null;
}

export function 시험캐릭터만들기(request: APIRequestContext, 토큰: string, 머리: string): Promise<number> {
  return 캐릭터만들고번호(request, 토큰, 시험계정번호(), 고유캐릭터이름(머리));
}

export async function 우편과캐릭터지우기(request: APIRequestContext, 토큰: string, 우편번호들: number[], 캐릭터번호들: number[]): Promise<void> {
  await 우편들지우기(request, 토큰, 우편번호들);
  await 캐릭터들지우기(request, 토큰, 캐릭터번호들);
}

export async function 우편한통읽기(request: APIRequestContext, 토큰: string, 번호: number): Promise<우편한통> {
  const 응답 = await 우편하나(request, 토큰, 번호);
  if (!응답.ok()) return { 코드: 응답.status(), id: 0, 캐릭터번호: 0, 저장글: '' };
  const 몸 = await 본문JSON<{ id: number; playerCharacterId: number; saveData: string }>(응답);
  return { 코드: 응답.status(), id: 몸.id, 캐릭터번호: 몸.playerCharacterId, 저장글: 몸.saveData };
}

export async function 우편목록결과읽기(request: APIRequestContext, 토큰: string, 캐릭터번호: number): Promise<우편목록결과> {
  const 응답 = await 데이터부르기(request, 토큰, 'getmailmessages', { PlayerCharacterId: 캐릭터번호 });
  if (!응답.ok()) return { 코드: 응답.status(), 몸: null };
  return { 코드: 응답.status(), 몸: await 본문JSON<{ mailMessages: 저장행[] }>(응답) };
}

export function 다른아이템번호(번호: number): number {
  let 새번호 = 새아이템번호();
  while (새번호 === 번호) 새번호 = 새아이템번호();
  return 새번호;
}
