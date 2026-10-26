import type { Page } from '@playwright/test';

import { API로그인 } from './account.helper.js';

export async function 계정으로로그인(page: Page, loginId: string | undefined, password: string | undefined): Promise<void> {
  if (loginId === undefined || password === undefined) throw new Error('계정 칸이 비었다 — 실행 설정의 계정이 채워져야 한다');
  await API로그인(page.request, loginId, password);
}
