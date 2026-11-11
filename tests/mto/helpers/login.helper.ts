import type { BrowserContext, Page } from '@playwright/test';

import { 로그인화면 } from '../pages/sign-in.page.js';

let 기억한계정: string | undefined;
const 한국어창들 = new WeakSet<BrowserContext>();
const 보관한세션 = new Map<string, Awaited<ReturnType<BrowserContext['cookies']>>>();

export async function 한국어로(page: Page): Promise<void> {
  const 창묶음 = page.context();
  if (한국어창들.has(창묶음)) return;
  한국어창들.add(창묶음);
  await 창묶음.route('**/*', (경로) => 경로.fallback({ headers: { ...경로.request().headers(), 'accept-language': 'ko-KR,ko;q=0.9' } }));
}

export async function 로그아웃하기(page: Page): Promise<void> {
  await page.context().clearCookies();
  기억한계정 = undefined;
}

async function 보관세션으로들어가기(page: Page, 아이디: string): Promise<boolean> {
  const 쿠키 = 보관한세션.get(아이디);
  if (쿠키 === undefined) return false;
  await page.context().clearCookies();
  await page.context().addCookies(쿠키);
  await page.goto('/settings/profile');
  return !new 로그인화면(page).로그인화면인가();
}

async function 들어가기(page: Page, 아이디: string, 비밀번호: string): Promise<void> {
  await 한국어로(page);
  if (await 보관세션으로들어가기(page, 아이디)) return;
  const 로그인 = new 로그인화면(page);
  await page.context().clearCookies();
  await 로그인.열기();
  console.log(`[로그인] 새로 함 ${아이디.slice(0, 4)}…`);
  await 로그인.로그인(아이디, 비밀번호);
  보관한세션.set(아이디, await page.context().cookies());
}

export async function 로그인하기(page: Page, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  if (!아이디 || !비밀번호) throw new Error('로그인할 계정 값이 비었다 — 대상 서버의 계정 설정을 확인한다');
  if (process.env.PLATFORM_SCENARIO_MODE === '1' && 기억한계정 === 아이디) return;
  await 들어가기(page, 아이디, 비밀번호);
  기억한계정 = 아이디;
}

export async function 새창(page: Page): Promise<Page> {
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('새 창을 열 브라우저를 찾지 못했다');
  const 창 = await (await 브라우저.newContext()).newPage();
  await 한국어로(창);
  return 창;
}

export async function 새창으로로그인(page: Page, 아이디: string | undefined, 비밀번호: string | undefined): Promise<Page> {
  if (!아이디 || !비밀번호) throw new Error('새 창에 로그인할 계정 값이 비었다');
  const 창 = await 새창(page);
  await 들어가기(창, 아이디, 비밀번호);
  return 창;
}
