import type { APIRequestContext, BrowserContext, Download, Page, Route } from '@playwright/test';

import type { 가입값 } from '../pages/signup.page.js';
import { API로그인, 새계정비밀번호, 새아이디, 탈퇴, 방해막기 } from './account.helper.js';

export const 결제완료주문번호 = 'DM20261009-0001';
export const 배송중주문번호 = 'DM20261001-0002';
export const 주문용상품번호 = 16;
export const 틀린비밀번호 = 'wrong#pass1';

export function 새가입값(): 가입값 {
  const 아이디 = 새아이디();
  return { 아이디, 비밀번호: 새계정비밀번호, 이름: '테스트회원', 이메일: `${아이디}@example.com`, 휴대폰: '01012345678' };
}

const 작은PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export function PNG만들기(바이트수?: number): Buffer {
  if (바이트수 === undefined || 바이트수 <= 작은PNG.length) return 작은PNG;
  return Buffer.concat([작은PNG, Buffer.alloc(바이트수 - 작은PNG.length)]);
}

export async function 느린응답걸기(문맥: BrowserContext, 주소: RegExp, 밀리초: number): Promise<() => Promise<void>> {
  const 처리 = async (길: Route) => {
    await new Promise((끝) => setTimeout(끝, 밀리초));
    await 길.continue();
  };
  await 문맥.route(주소, 처리);
  return () => 문맥.unroute(주소, 처리);
}

export async function 새브라우저로옮기기(page: Page): Promise<{ 쪽: Page; 닫기: () => Promise<void> }> {
  const 문맥 = page.context();
  const 브라우저 = 문맥.browser();
  if (브라우저 === null) throw new Error('브라우저를 찾지 못해 새 창을 열 수 없다');
  const 쿠키 = (await 문맥.cookies()).filter((c) => c.expires > 0);
  const 새문맥 = await 브라우저.newContext({ baseURL: new URL(page.url()).origin });
  await 새문맥.addCookies(쿠키);
  const 쪽 = await 새문맥.newPage();
  await 방해막기(쪽);
  return { 쪽, 닫기: () => 새문맥.close() };
}

export async function 새계정치우기(req: APIRequestContext, 계정: { loginId: string; password: string }): Promise<void> {
  const 상태 = await API로그인(req, 계정.loginId, 계정.password);
  if (상태 === 200) await 탈퇴(req);
}

export async function 내려받은글첫줄(내려받기: Download): Promise<string> {
  const 흐름 = await 내려받기.createReadStream();
  const 조각: Buffer[] = [];
  for await (const 덩이 of 흐름) 조각.push(Buffer.from(덩이));
  const 줄들 = Buffer.concat(조각).toString('utf8').replace(/^﻿/, '').split(/\r?\n/);
  return 줄들[0] ?? '';
}

function 두자리(수: number): string {
  return String(수).padStart(2, '0');
}

export function 날짜글(날: Date): string {
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export function 몇달전날짜(달: number, 기준: Date = new Date()): string {
  const 날 = new Date(기준.getTime());
  날.setMonth(날.getMonth() - 달);
  return 날짜글(날);
}

export function 오늘여덟자리(기준: Date = new Date()): string {
  return 날짜글(기준).replaceAll('-', '');
}

export async function 아이디가있는가(req: APIRequestContext, 아이디: string): Promise<boolean> {
  const 응답 = await req.get(`/api/auth/check-id?loginId=${encodeURIComponent(아이디)}`);
  const 본문 = (await 응답.json()) as { available?: boolean };
  return 본문.available === false;
}

export async function 공지빼고방해막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('dm_cookie_ok', '1');
      sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  });
}

export async function 응답본문가로채기(
  문맥: BrowserContext,
  주소: RegExp,
): Promise<{ 본문: () => string; 해제: () => Promise<void> }> {
  let 받은본문 = '';
  const 처리 = async (길: Route) => {
    const 응답 = await 길.fetch();
    받은본문 = await 응답.text();
    await 길.fulfill({ response: 응답, body: 받은본문 });
  };
  await 문맥.route(주소, 처리);
  return { 본문: () => 받은본문, 해제: () => 문맥.unroute(주소, 처리) };
}
