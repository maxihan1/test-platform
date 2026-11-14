import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 캐릭터만들기 } from './data.helper.js';

export async function 이름겹침이풀릴때까지만들기(request: APIRequestContext, 토큰: string, 계정번호: number, 이름: string): Promise<APIResponse> {
  let 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
  for (let 회 = 0; 회 < 20 && 응답.status() === 400; 회 += 1) {
    await new Promise((끝) => setTimeout(끝, 500));
    응답 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
  }
  return 응답;
}

export function 길드소속저장데이터(길드번호: number): string {
  return JSON.stringify({ GuildId: 길드번호, Level: 1 });
}

export function 친구저장데이터(친구번호들: number[]): string {
  return JSON.stringify({ FriendList: 친구번호들.map((n) => ({ CharacterId: n })) });
}

function 저장칸(저장데이터: string, 칸: string): unknown {
  try {
    return (JSON.parse(저장데이터) as Record<string, unknown>)[칸];
  } catch {
    return undefined;
  }
}

export function 길드번호읽기(저장데이터: string): number {
  const 값 = 저장칸(저장데이터, 'GuildId');
  return typeof 값 === 'number' ? 값 : -1;
}

export function 길드이름읽기(저장데이터: string): string {
  const 값 = 저장칸(저장데이터, 'GuildName');
  return typeof 값 === 'string' ? 값 : '';
}
