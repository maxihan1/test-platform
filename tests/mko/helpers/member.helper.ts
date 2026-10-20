import type { Page } from '@playwright/test';

export interface 새회원 {
  아이디: string;
  비밀번호: string;
  이름: string;
}

function 무작위글자(길이: number): string {
  let 글자 = '';
  while (글자.length < 길이) 글자 += Math.random().toString(36).slice(2);
  return 글자.slice(0, 길이);
}

export function 새회원정보(): 새회원 {
  return {
    아이디: `mko${무작위글자(9)}`,
    비밀번호: `Mk!${무작위글자(8)}7`,
    이름: '운영툴시험',
  };
}

export async function 회원가입(page: Page, 회원: 새회원): Promise<number> {
  const 응답 = await page.request.post('/api/auth/signup', {
    data: {
      loginId: 회원.아이디,
      password: 회원.비밀번호,
      passwordConfirm: 회원.비밀번호,
      name: 회원.이름,
      email: `${회원.아이디}@example.com`,
      phone: '',
      birth: '',
      gender: 'none',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  return 응답.status();
}

export async function 회원로그인(page: Page, 회원: 새회원): Promise<number> {
  const 응답 = await page.request.post('/api/auth/login', {
    data: { loginId: 회원.아이디, password: 회원.비밀번호, remember: false },
  });
  return 응답.status();
}

export async function 아이디사용중인가(page: Page, 아이디: string): Promise<boolean> {
  const 응답 = await page.request.get(`/api/auth/check-id?loginId=${encodeURIComponent(아이디)}`);
  const 본문 = (await 응답.json()) as { available?: boolean };
  return 본문.available === false;
}

export async function 로그인한아이디(page: Page): Promise<string | null> {
  const 응답 = await page.request.get('/api/session');
  const 본문 = (await 응답.json()) as { user?: { loginId?: string } | null };
  return 본문.user?.loginId ?? null;
}

export async function 가입자정리하기(page: Page, 회원: 새회원): Promise<void> {
  if ((await 로그인한아이디(page)) !== 회원.아이디) await 회원로그인(page, 회원);
  await page.request.delete('/api/me');
}
