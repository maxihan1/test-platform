import type { BrowserContext, Page } from '@playwright/test';
import { 로그인이어쓰기 } from '@platform/kit/parts';

import { 한국어로 } from './page-setup.helper.js';

const 기억 = new WeakMap<Page, string>();
const 남긴세션을쓰는창 = new Map<string, BrowserContext>();

async function 지금계정(page: Page): Promise<string | null | undefined> {
  if (process.env.PLATFORM_SCENARIO_MODE !== '1') return undefined;
  return 기억.get(page);
}

export async function 로그아웃하기(page: Page): Promise<void> {
  await page.context().clearCookies();
  기억.delete(page);
}

async function 화면으로로그인(page: Page, 아이디: string, 암호: string): Promise<void> {
  await 로그아웃하기(page);
  await page.goto('/auth/sign_in');
  await page.getByRole('textbox', { name: '이메일 주소' }).fill(아이디);
  await page.getByRole('textbox', { name: '암호' }).fill(암호);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/sign_in'));
}

async function 로그인된채홈열기(page: Page): Promise<boolean> {
  const 설정화면 = await page.request.get('/settings/profile', { maxRedirects: 0 });
  if (설정화면.status() !== 200) return false;
  await page.goto('/home');
  return true;
}

export async function 로그인하기(page: Page, 아이디: string | undefined, 암호: string | undefined): Promise<void> {
  if (아이디 === undefined || 암호 === undefined) throw new Error('로그인 계정 값이 비었다 — 대상 서버 줄의 계정을 확인한다');
  await 한국어로(page);
  const 지금 = await 지금계정(page);
  if (지금 === 아이디) {
    await page.goto('/home');
    await page.getByRole('navigation', { name: '메인' }).waitFor();
    return;
  }
  const 쓰는창 = 남긴세션을쓰는창.get(아이디);
  if (쓰는창 !== undefined && 쓰는창 !== page.context()) {
    await 화면으로로그인(page, 아이디, 암호);
  } else {
    남긴세션을쓰는창.set(아이디, page.context());
    await 로그인이어쓰기(page, 아이디, 암호, {
      로그인: () => 화면으로로그인(page, 아이디, 암호),
      들어왔나: () => 로그인된채홈열기(page),
    });
  }
  기억.set(page, 아이디);
}

export async function 웹앱열릴때까지(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: '메인' }).waitFor();
}
