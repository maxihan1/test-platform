import type { APIRequestContext, Browser, Page } from '@playwright/test';

export interface 일회용회원 {
  id: number;
  loginId: string;
  password: string;
}

const 꼬리 = () => `${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;

export const 일회용비밀번호 = () => `Dm${꼬리()}!7`;

export async function 회원가입(request: APIRequestContext): Promise<일회용회원> {
  const loginId = `dmo${꼬리()}`.slice(0, 12);
  const password = 일회용비밀번호();
  const res = await request.post('/api/auth/signup', {
    data: {
      loginId, password, passwordConfirm: password, name: '일회용', email: `${loginId}@example.com`,
      phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`일회용 회원 가입 실패 ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { id: number };
  return { id: body.id, loginId, password };
}

export async function API로그인(page: Page, loginId: string, password: string): Promise<void> {
  const res = await page.request.post('/api/auth/login', { data: { loginId, password, remember: false } });
  if (!res.ok()) throw new Error(`로그인 실패 ${res.status()} ${await res.text()}`);
}

export async function 화면로그인(page: Page, loginId: string, password: string): Promise<void> {
  await page.getByLabel('아이디', { exact: true }).fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
}

export async function 관리자로그인(page: Page, loginId: string, password: string, 주소 = '/ops'): Promise<void> {
  await API로그인(page, loginId, password);
  await page.goto(주소);
  await page.locator('#ops-main[aria-busy="true"]').waitFor({ state: 'detached' });
}

export async function 회원창(browser: Browser, loginId: string, password: string): Promise<Page> {
  const 창묶음 = await browser.newContext();
  const 창 = await 창묶음.newPage();
  await API로그인(창, loginId, password);
  return 창;
}

export function 브라우저(page: Page): Browser {
  const 값 = page.context().browser();
  if (!값) throw new Error('이 창은 브라우저에서 열린 것이 아니라 회원 창을 새로 만들 수 없다');
  return 값;
}
