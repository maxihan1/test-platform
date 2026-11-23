// 웹 로그인 도우미가 화면으로 로그인하면서 kit 로그인이어쓰기 를 안 부르면 K18 로 막는지, API 로그인 · 앱 도우미 · 다른 파일은 안 건드리는지 검사한다

import { sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkNonCase } from './pageObject.js';

const 도우미 = 'new/helpers/login.helper.ts';
const k18 = (file: string, 글: string): number[] => checkNonCase(file, 글).filter((x) => x.rule === 'K18').map((x) => x.line);

const 화면에글자넣는도우미 = `import type { Page } from '@playwright/test';

export async function 로그인하기(page: Page, 아이디: string, 암호: string): Promise<void> {
  await page.goto('/auth/sign_in');
  await page.getByRole('textbox', { name: '이메일 주소' }).fill(아이디);
  await page.getByRole('textbox', { name: '암호' }).fill(암호);
  await page.getByRole('button', { name: '로그인' }).click();
}
`;

const 화면객체로로그인하는도우미 = `import type { Page } from '@playwright/test';

import { 로그인화면 } from '../pages/sign-in.page.js';

export async function 로그인하기(page: Page, 아이디: string, 암호: string): Promise<void> {
  const 로그인 = new 로그인화면(page);
  await 로그인.열기();
  await 로그인.로그인(아이디, 암호);
}
`;

const 부품을부르는도우미 = `import type { Page } from '@playwright/test';
import { 로그인이어쓰기 } from '@platform/kit/parts';

import { 로그인화면 } from '../pages/sign-in.page.js';

export async function 로그인하기(page: Page, 아이디: string, 암호: string): Promise<void> {
  const 로그인 = new 로그인화면(page);
  await 로그인이어쓰기(page, 아이디, 암호, {
    로그인: async () => {
      await 로그인.열기();
      await page.getByRole('textbox', { name: '암호' }).fill(암호);
    },
    들어왔나: async () => (await page.request.get('/settings/profile', { maxRedirects: 0 })).status() === 200,
  });
}
`;

describe('K18 웹 로그인 도우미는 화면 로그인을 kit 로그인이어쓰기 에 넘긴다', () => {
  it('화면에 글자를 넣어 로그인하는데 부품을 안 부르면 처음 글자를 넣는 줄을 짚는다', () => {
    expect(k18(도우미, 화면에글자넣는도우미)).toEqual([5]);
  });

  it('화면 객체를 가져와 로그인하는데 부품을 안 부르면 가져오는 줄을 짚는다', () => {
    expect(k18(도우미, 화면객체로로그인하는도우미)).toEqual([3]);
  });

  it('부품을 부르면 화면으로 로그인해도 된다 — 다른 이름으로 가져와 불러도 된다', () => {
    expect(k18(도우미, 부품을부르는도우미)).toEqual([]);
    const 다른이름 = 부품을부르는도우미.replace('{ 로그인이어쓰기 }', '{ 로그인이어쓰기 as 이어쓰기 }').replace('await 로그인이어쓰기(', 'await 이어쓰기(');
    expect(k18(도우미, 다른이름)).toEqual([]);
  });

  it('부품을 가져오기만 하고 안 부르면 막는다', () => {
    const 글 = 화면에글자넣는도우미.replace("from '@playwright/test';", "from '@playwright/test';\nimport { 로그인이어쓰기 } from '@platform/kit/parts';");
    expect(k18(도우미, 글)).toEqual([6]);
  });

  it('API 로 로그인하고 화면만 여는 도우미는 안 건다', () => {
    const 글 = `import type { Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-shell.component.js';

export async function 운영자로열기(page: Page, 아이디: string, 비밀번호: string): Promise<운영틀> {
  const 응답 = await page.request.post('/api/login', { data: { userName: 아이디, password: 비밀번호 } });
  if (!응답.ok()) throw new Error('로그인 실패');
  await page.goto('/');
  return new 운영틀(page);
}
`;
    expect(k18(도우미, 글)).toEqual([]);
  });

  it('화면 객체를 타입으로만 가져오면 화면 로그인으로 안 본다', () => {
    const 글 = `import type { Page } from '@playwright/test';

import type { 로그인화면 } from '../pages/sign-in.page.js';

export function 주소(화면: 로그인화면, page: Page): string {
  return String(화면) + page.url();
}
`;
    expect(k18(도우미, 글)).toEqual([]);
  });

  it('Playwright 를 안 가져오는 앱 · 게임 도우미는 안 건다', () => {
    const 글 = `import type { AppDriver } from '@platform/kit/app';

import { 로그인화면 } from '../pages/login.page.js';

export async function 로그인하기(driver: AppDriver, 아이디: string, 암호: string): Promise<void> {
  await new 로그인화면(driver).로그인(아이디, 암호);
}
`;
    expect(k18(도우미, 글)).toEqual([]);
  });

  it('login.helper.ts 가 아닌 파일은 보지 않는다', () => {
    expect(k18('new/helpers/account.helper.ts', 화면에글자넣는도우미)).toEqual([]);
    expect(k18('new/pages/login.page.ts', 화면에글자넣는도우미)).toEqual([]);
    expect(k18('new/helpers/login-tools.helper.ts', 화면에글자넣는도우미)).toEqual([]);
  });

  it('경로 구분자가 달라도 같은 파일로 본다', () => {
    expect(k18(['new', 'helpers', 'login.helper.ts'].join(sep), 화면에글자넣는도우미)).toEqual([5]);
  });
});
