import type { Page } from '@playwright/test';

import { 로그인하기 } from './login.helper.js';
import { 새창열기 } from './page-setup.helper.js';

export interface 새계정 {
  사용자명: string;
  이메일: string;
  암호: string;
}

export function 새사용자명(): string {
  return `tc_signup${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.slice(0, 30);
}

export function 새계정값(): 새계정 {
  const 사용자명 = 새사용자명();
  return { 사용자명, 이메일: `${사용자명}@maxihan.com`, 암호: `Tc-${사용자명}-9` };
}

export async function 가입화면열기(page: Page): Promise<number> {
  await page.goto('/auth/sign_up');
  await page.getByRole('button', { name: '등록하기' }).waitFor();
  return Date.now();
}

export async function 연지3초지날때까지(page: Page, 연시각: number): Promise<void> {
  await page.waitForFunction((t) => Date.now() > t + 3500, 연시각, { timeout: 10_000 });
}

export async function 가입하기(page: Page, 값: 새계정): Promise<void> {
  const 연시각 = await 가입화면열기(page);
  await page.getByRole('textbox', { name: '사용자명' }).fill(값.사용자명);
  await page.getByRole('textbox', { name: '이메일 주소' }).fill(값.이메일);
  await page.getByRole('textbox', { name: '암호', exact: true }).fill(값.암호);
  await page.getByRole('textbox', { name: '암호 다시 입력' }).fill(값.암호);
  await page.getByRole('checkbox', { name: /개인정보처리방침/ }).check();
  await 연지3초지날때까지(page, 연시각);
  await page.getByRole('button', { name: '등록하기' }).click();
  await page.getByRole('heading', { name: '수신함 확인하기' }).waitFor();
}

export async function 관리자로이메일확인(관리자창: Page, 사용자명: string): Promise<void> {
  await 관리자창.goto(`/admin/accounts?username=${encodeURIComponent(사용자명)}`);
  await 관리자창.getByRole('link', { name: new RegExp(사용자명) }).first().click();
  const 확인 = 관리자창.getByRole('link', { name: '신원 확인' });
  await 확인.click();
  await 관리자창.getByRole('link', { name: '신원 확인' }).waitFor({ state: 'detached' });
}

export async function 확인된새계정만들기(page: Page, 관리자아이디: string | undefined, 관리자암호: string | undefined): Promise<새계정> {
  const 값 = 새계정값();
  const 가입창 = await 새창열기(page);
  try {
    await 가입하기(가입창.page, 값);
  } finally {
    await 가입창.창묶음.close();
  }
  const 관리창 = await 새창열기(page);
  try {
    await 로그인하기(관리창.page, 관리자아이디, 관리자암호);
    await 관리자로이메일확인(관리창.page, 값.사용자명);
  } finally {
    await 관리창.창묶음.close();
  }
  return 값;
}
