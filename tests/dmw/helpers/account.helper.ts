import type { APIRequestContext, Page } from '@playwright/test';

export interface 회원 {
  id: number;
  loginId: string;
  password: string;
  name: string;
  email: string;
}

export function 새아이디(): string {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 12);
}

export function 새비밀번호(): string {
  return `Te${Math.random().toString(36).slice(2, 8)}!7`;
}

export async function 일회용회원만들기(요청: APIRequestContext, 이름 = '시험회원'): Promise<회원> {
  const loginId = 새아이디();
  const password = 새비밀번호();
  const email = `${loginId}@example.com`;
  const res = await 요청.post('/api/auth/signup', {
    data: { loginId, password, passwordConfirm: password, name: 이름, email, phone: '', birth: '', gender: 'none', interests: [], terms: true, privacy: true, marketing: false },
  });
  if (res.status() !== 201) throw new Error(`일회용 회원을 만들지 못했다: ${res.status()} ${await res.text()}`);
  const 몸 = (await res.json()) as { id: number };
  return { id: 몸.id, loginId, password, name: 이름, email };
}

export async function API로그인(요청: APIRequestContext, loginId: string, password: string, remember = false): Promise<void> {
  const res = await 요청.post('/api/auth/login', { data: { loginId, password, remember } });
  if (!res.ok()) throw new Error(`로그인하지 못했다: ${res.status()} ${await res.text()}`);
}

export async function 일회용회원으로로그인(page: Page, 이름 = '시험회원'): Promise<회원> {
  const 새회원 = await 일회용회원만들기(page.request, 이름);
  await API로그인(page.request, 새회원.loginId, 새회원.password);
  return 새회원;
}

export async function 비밀번호틀리기(요청: APIRequestContext, loginId: string, 횟수: number): Promise<number[]> {
  const 상태들: number[] = [];
  for (let i = 0; i < 횟수; i += 1) {
    const res = await 요청.post('/api/auth/login', { data: { loginId, password: `Wrong${i}!x9`, remember: false } });
    상태들.push(res.status());
  }
  return 상태들;
}
