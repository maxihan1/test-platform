import type { APIRequestContext } from '@playwright/test';

import { 손님봇켜기, 접속자 } from './game-state.helper.js';

export async function 손님봇들어올때까지(admin: APIRequestContext, 이름: string, 한도ms = 15_000): Promise<boolean> {
  await 손님봇켜기(admin, 이름);
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await 접속자(admin)).players.some((줄) => 줄.user === 이름)) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 접속한사람수(admin: APIRequestContext): Promise<number> {
  return (await 접속자(admin)).players.length;
}
