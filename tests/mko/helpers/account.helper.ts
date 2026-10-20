import type { APIRequestContext, Page } from '@playwright/test';

export interface 시험회원 {
  loginId: string;
  password: string;
}

const 글자들 = 'abcdefghijklmnopqrstuvwxyz0123456789';

function 아무글자(길이: number): string {
  return Array.from({ length: 길이 }, () => 글자들[Math.floor(Math.random() * 글자들.length)]).join('');
}

export async function 시험회원가입(request: APIRequestContext): Promise<시험회원> {
  const loginId = `mko${아무글자(9)}`;
  const password = `Mk${아무글자(6)}!a9`;
  const 응답 = await request.post('/api/auth/signup', {
    data: {
      loginId,
      password,
      passwordConfirm: password,
      name: '운영툴시험',
      email: `${loginId}@example.com`,
      phone: '01012345678',
      birth: '1990-01-01',
      gender: 'none',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (!응답.ok()) throw new Error(`시험 회원 가입이 실패했다 — ${String(응답.status())} ${await 응답.text()}`);
  return { loginId, password };
}

export async function 로그인(page: Page, 회원: 시험회원): Promise<void> {
  const 응답 = await page.request.post('/api/auth/login', { data: { loginId: 회원.loginId, password: 회원.password } });
  if (!응답.ok()) throw new Error(`시험 회원 로그인이 실패했다 — ${String(응답.status())} ${await 응답.text()}`);
}

export async function 로그인한아이디(page: Page): Promise<string | null> {
  const 응답 = await page.request.get('/api/session');
  if (!응답.ok()) throw new Error(`로그인 상태를 읽지 못했다 — ${String(응답.status())}`);
  const 본문 = (await 응답.json()) as { user: { loginId?: string } | null };
  return 본문.user?.loginId ?? null;
}

export async function 탈퇴(page: Page, 회원: 시험회원): Promise<void> {
  await 로그인(page, 회원);
  const 응답 = await page.request.delete('/api/me');
  if (!응답.ok()) throw new Error(`시험 회원 탈퇴가 실패했다 — ${String(응답.status())} ${await 응답.text()}`);
}
