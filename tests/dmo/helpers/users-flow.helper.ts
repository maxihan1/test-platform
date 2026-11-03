import type { Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export interface 세션회원 {
  loginId: string;
  role: string;
}

export async function 세션읽기(page: Page): Promise<세션회원 | null> {
  const res = await page.request.get('/api/session');
  if (!res.ok()) throw new Error(`GET /api/session 실패 ${res.status()}`);
  const body = (await res.json()) as { user: 세션회원 | null };
  return body.user;
}

export function 길이별비밀번호(길이: number): string {
  const 시작 = 'Dm!7';
  const 글자 = 'abcdefghijkmnpqrstuvwxyz23456789';
  let 꼬리 = '';
  while (시작.length + 꼬리.length < 길이) 꼬리 += 글자[Math.floor(Math.random() * 글자.length)];
  return (시작 + 꼬리).slice(0, 길이);
}

export async function 회원상태읽기(page: Page, loginId: string): Promise<string> {
  const res = await page.request.get(`/api/ops/users?q=${encodeURIComponent(loginId)}&status=&page=1&size=20`);
  if (!res.ok()) throw new Error(`운영툴 회원 목록 읽기 실패 ${res.status()}`);
  const body = (await res.json()) as { items: { loginId: string; status: string }[] };
  const 회원 = body.items.find((u) => u.loginId === loginId);
  if (!회원) throw new Error(`운영툴 회원 목록에 ${loginId} 가 없다`);
  return 회원.status;
}

export async function 회원비밀번호바꾸기(page: Page, userId: number, password: string): Promise<void> {
  const res = await page.request.post(`/api/ops/users/${userId}/password`, { data: { password } });
  if (!res.ok()) throw new Error(`회원 비밀번호 바꾸기 실패 ${res.status()} ${await res.text()}`);
}

export async function 상품가격저장시도(
  page: Page,
  상품: { id: number; price: number; discountRate: number; stock: number },
  가격: number,
): Promise<number> {
  const res = await page.request.put(`/api/ops/products/${상품.id}`, {
    data: { price: 가격, discountRate: 상품.discountRate, stock: 상품.stock },
  });
  return res.status();
}

export async function 홈공지팝업껐다켜기(page: Page): Promise<void> {
  const 틀 = new 운영틀(page);
  await page.goto('/ops/env');
  await 틀.다그려질때까지();
  const 스위치 = 틀.본문.getByRole('switch', { name: '홈에 들어오면 공지 팝업을 띄운다' });
  await 스위치.waitFor();
  const 원래 = await 스위치.isChecked();
  const 저장응답 = () => page.waitForResponse((r) => r.url().includes('/api/admin/settings') && r.request().method() === 'PUT');
  try {
    for (const 켬 of [!원래, 원래]) {
      const 응답 = 저장응답();
      if (켬) await 스위치.check();
      else await 스위치.uncheck();
      await 응답;
    }
  } finally {
    const 지금 = await page.request.get('/api/settings');
    const 값 = (await 지금.json()) as { noticePopup: boolean };
    if (값.noticePopup !== 원래) {
      await page.request.put('/api/admin/settings', { data: { noticePopup: 원래 } });
    }
  }
}
