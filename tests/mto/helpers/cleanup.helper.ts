import type { Page } from '@playwright/test';

import { 새창으로로그인 } from './login.helper.js';

export async function Owner창으로정리하기(
  page: Page,
  아이디: string | undefined,
  비밀번호: string | undefined,
  정리: (Owner창: Page) => Promise<void>,
): Promise<void> {
  const Owner창 = await 새창으로로그인(page, 아이디, 비밀번호);
  try {
    await 정리(Owner창);
  } finally {
    await Owner창.context().close();
  }
}
