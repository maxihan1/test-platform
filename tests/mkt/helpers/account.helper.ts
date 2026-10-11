import type { APIRequestContext, Page } from '@playwright/test';

export const 둘째아이디 = 'user2';
export const 잠긴아이디 = 'locked';
export const 새계정비밀번호 = 'mkt#case2026';

export interface 새계정 {
  loginId: string;
  email: string;
  name: string;
  password: string;
}

export function 새아이디(머리 = 't'): string {
  const 꼬리 = Date.now().toString(36) + Math.floor(Math.random() * 36 * 36).toString(36);
  return (머리 + 꼬리).toLowerCase().slice(0, 12);
}

export async function 방해막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const d = new Date();
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 오늘 = `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}`;
    try {
      localStorage.setItem('dm_cookie_ok', '1');
      localStorage.setItem('dm_notice_hide', 오늘);
      sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  });
}

export async function 화면로그인(page: Page, 아이디: string, 비밀번호: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(아이디);
  await page.getByLabel('비밀번호', { exact: true }).fill(비밀번호);
  await page.locator('.login-form button[type=submit]').click();
  await page.locator('#site-header .logout').waitFor();
}

export async function API로그인(req: APIRequestContext, 아이디: string, 비밀번호: string): Promise<number> {
  const res = await req.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
  return res.status();
}

export async function 새계정가입(req: APIRequestContext): Promise<새계정> {
  const loginId = 새아이디();
  const 계정: 새계정 = { loginId, email: `${loginId}@example.com`, name: '테스트회원', password: 새계정비밀번호 };
  const res = await req.post('/api/auth/signup', {
    data: {
      loginId,
      password: 계정.password,
      passwordConfirm: 계정.password,
      name: 계정.name,
      email: 계정.email,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (res.status() !== 201 && res.status() !== 200) throw new Error(`새 계정 가입 실패: ${res.status()} ${await res.text()}`);
  return 계정;
}

export async function 탈퇴(req: APIRequestContext): Promise<number> {
  const res = await req.delete('/api/me');
  return res.status();
}
