import type { Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-shell.component.js';

function 계정값(아이디: string | undefined, 비밀번호: string | undefined): { 아이디: string; 비밀번호: string } {
  if (!아이디 || !비밀번호) throw new Error('운영자 계정 값이 없다 — 대상 서버 계정(PLATFORM_ACCOUNTS)이 채워지지 않았다');
  return { 아이디, 비밀번호 };
}

export async function 운영자쿠키받기(page: Page, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  const 값 = 계정값(아이디, 비밀번호);
  const 지금 = await page.request.get('/api/session');
  if (지금.ok()) {
    const 몸 = (await 지금.json().catch(() => ({}))) as { operator?: { userName?: string } | null };
    if (몸.operator?.userName === 값.아이디) return;
  }
  const 응답 = await page.request.post('/api/login', { data: { userName: 값.아이디, password: 값.비밀번호 } });
  if (!응답.ok()) throw new Error(`운영자 로그인 API 가 ${String(응답.status())} 로 실패했다`);
}

export async function 운영자로열기(page: Page, 아이디: string | undefined, 비밀번호: string | undefined, 주소 = '/'): Promise<운영틀> {
  await 운영자쿠키받기(page, 아이디, 비밀번호);
  await page.goto(주소);
  const 틀 = new 운영틀(page);
  await 틀.그려질때까지();
  return 틀;
}
