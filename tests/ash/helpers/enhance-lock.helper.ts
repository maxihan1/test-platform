import type { APIRequestContext } from '@playwright/test';

import { 강화기록읽기 } from './admin.helper.js';
import { 강화창 } from '../pages/enhance.page.js';

const 쉰다 = (ms: number) => new Promise((깨운다) => setTimeout(깨운다, ms));

export async function 강화기록수(admin: APIRequestContext, 누구: { 번호: number }): Promise<number> {
  return (await 강화기록읽기(admin, 누구)).length;
}

export async function 강화기록이멈출때까지(admin: APIRequestContext, 누구: { 번호: number }, 앞: number, 한도 = 10_000): Promise<number> {
  const 끝 = Date.now() + 한도;
  let 지금 = await 강화기록수(admin, 누구);
  while (지금 === 앞 && Date.now() < 끝) {
    await 쉰다(300);
    지금 = await 강화기록수(admin, 누구);
  }
  const 가라앉을때 = Date.now() + 3_000;
  while (Date.now() < 가라앉을때) {
    await 쉰다(500);
    지금 = Math.max(지금, await 강화기록수(admin, 누구));
  }
  return 지금;
}

export interface 결과뜬때 {
  결과: string;
  가장일찍: number;
}

export async function 결과뜰때까지(창: 강화창, 앞결과: string, 누른때: number, 한도 = 15_000): Promise<결과뜬때> {
  const 끝 = Date.now() + 한도;
  let 가장일찍 = 누른때;
  for (;;) {
    const 읽기시작 = Date.now();
    const 지금 = await 창.결과글();
    if (지금 !== '' && 지금 !== 앞결과) return { 결과: 지금, 가장일찍 };
    if (Date.now() >= 끝) throw new Error(`강화 결과 글이 ${String(한도 / 1000)}초 안에 바뀌지 않았다 (마지막: ${지금})`);
    가장일찍 = 읽기시작;
  }
}

export async function 누르고결과뜰때까지(창: 강화창): Promise<결과뜬때> {
  const 앞결과 = await 창.결과글();
  const 누른때 = Date.now();
  await 창.강화누르기();
  return 결과뜰때까지(창, 앞결과, 누른때);
}

export function 지난시간(뜬때: 결과뜬때): number {
  return Date.now() - 뜬때.가장일찍;
}
