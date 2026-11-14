import type { Page } from '@playwright/test';

import { apiGet, 몸 } from './api.helper.js';

export function 암호만들기(길이: number): string {
  return 'Tc-9aB'.repeat(Math.ceil(길이 / 6)).slice(0, 길이);
}

export function 글자채우기(길이: number): string {
  return 'u'.repeat(길이);
}

export function 긴이메일만들기(총길이: number): string {
  const 도메인 = 'maxihan.com';
  return `${'t'.repeat(총길이 - 도메인.length - 1)}@${도메인}`;
}

export async function 프로필색인차단됨(page: Page, 사용자명: string): Promise<boolean> {
  const 계정 = await 몸<{ noindex: boolean }>(await apiGet(page, `/api/v1/accounts/lookup?acct=${encodeURIComponent(사용자명)}`));
  return 계정.noindex;
}
