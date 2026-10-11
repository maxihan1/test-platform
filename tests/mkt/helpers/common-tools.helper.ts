import type { APIRequestContext, Locator, Page, Route } from '@playwright/test';

import { 홈화면 } from '../pages/home.page.js';
import { 탈퇴, type 회원정보 } from './account.helper.js';
import { 상품목록, 상품정보, 장바구니담기 } from './shop.helper.js';

export async function 보이는이름들(대상: Record<string, Locator>): Promise<string> {
  const 보임: string[] = [];
  for (const [이름, 칸] of Object.entries(대상)) {
    if (await 칸.isVisible()) 보임.push(이름);
  }
  return 보임.join(', ');
}

export async function 보이는글(칸: Locator): Promise<string> {
  return (await 칸.isVisible()) ? (await 칸.innerText()).trim() : '';
}

export async function 빨간글자인가(칸: Locator): Promise<boolean> {
  return 칸.evaluate((el) => {
    const 찾음 = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(el).color);
    if (찾음 === null) return false;
    const [r, g, b] = [Number(찾음[1]), Number(찾음[2]), Number(찾음[3])];
    return r > 150 && g < 100 && b < 100;
  });
}

export async function 화면안에있나(칸: Locator, 기다림밀리초 = 0): Promise<boolean> {
  return 칸.evaluate(
    (el, 한도) =>
      new Promise<boolean>((끝) => {
        const 시작 = performance.now();
        const 보기 = (): void => {
          const r = el.getBoundingClientRect();
          const 안 = r.width > 0 && r.left >= 0 && r.right <= window.innerWidth;
          if (안 || performance.now() - 시작 >= 한도) 끝(안);
          else requestAnimationFrame(보기);
        };
        보기();
      }),
    기다림밀리초,
  );
}

export async function 화면가운데인가(칸: Locator, 기다림밀리초 = 2000): Promise<boolean> {
  return 칸.evaluate(
    (el, 한도) =>
      new Promise<boolean>((끝) => {
        const 시작 = performance.now();
        const 보기 = (): void => {
          const r = el.getBoundingClientRect();
          const 가운데 =
            Math.abs(r.left + r.width / 2 - window.innerWidth / 2) <= 8 && Math.abs(r.top + r.height / 2 - window.innerHeight / 2) <= 8;
          if (가운데 || performance.now() - 시작 >= 한도) 끝(가운데);
          else requestAnimationFrame(보기);
        };
        보기();
      }),
    기다림밀리초,
  );
}

export async function 초점있나(칸: Locator): Promise<boolean> {
  return 칸.evaluate((el) => el === el.ownerDocument.activeElement);
}

export async function 세션아이디(page: Page): Promise<string | null> {
  const 응답 = await page.request.get('/api/session');
  const 본문 = (await 응답.json()) as { user: { loginId: string } | null };
  return 본문.user === null ? null : 본문.user.loginId;
}

export function 경로(page: Page): string {
  return new URL(page.url()).pathname;
}

export async function 처음방문인가(page: Page): Promise<boolean> {
  return (await page.context().storageState()).origins.length === 0;
}

export async function 불투명도재기(page: Page, 선택자: string, 밀리초: number): Promise<number[]> {
  return page.evaluate(
    ({ 대상, 시간 }) =>
      new Promise<number[]>((끝) => {
        const 값들: number[] = [];
        const 시작 = performance.now();
        const 보기 = (): void => {
          const el = document.querySelector(대상);
          if (el !== null) 값들.push(Number(getComputedStyle(el).opacity));
          if (performance.now() - 시작 >= 시간) 끝(값들);
          else requestAnimationFrame(보기);
        };
        보기();
      }),
    { 대상: 선택자, 시간: 밀리초 },
  );
}

export function 서서히바뀌었나(값들: number[]): boolean {
  return 값들.some((값) => 값 > 0.05 && 값 < 0.95);
}

export async function 응답붙잡기(page: Page, 주소패턴: string): Promise<{ 풀기: () => Promise<void> }> {
  let 열림: () => void = () => undefined;
  const 문 = new Promise<void>((resolve) => {
    열림 = resolve;
  });
  const 처리들: Promise<void>[] = [];
  const 처리 = (route: Route): void => {
    처리들.push(
      (async () => {
        await 문;
        await route.continue();
      })(),
    );
  };
  await page.context().route(주소패턴, 처리);
  return {
    풀기: async () => {
      열림();
      await Promise.all(처리들);
      await page.context().unroute(주소패턴, 처리);
    },
  };
}

export async function 브라우저닫았다다시열기(page: Page): Promise<{ 새쪽: Page; 닫기: () => Promise<void> }> {
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('브라우저를 새로 열 수 없다');
  const 오래가는쿠키 = (await page.context().cookies()).filter((쿠키) => 쿠키.expires > 0);
  const 맥락 = await 브라우저.newContext({ baseURL: new URL(page.url()).origin });
  await 맥락.addCookies(오래가는쿠키);
  return { 새쪽: await 맥락.newPage(), 닫기: () => 맥락.close() };
}

export function 글자수(글자: string, 개수: number): string {
  return 글자.repeat(개수).slice(0, 개수);
}

export async function 홈열고장바구니기다리기(page: Page): Promise<void> {
  const 응답 = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/cart' && r.request().method() === 'GET');
  await page.goto('/');
  await 응답;
  await page.waitForLoadState('networkidle');
}

export async function 장바구니에상품담기(api: APIRequestContext, 개수: number): Promise<number> {
  const { items } = await 상품목록(api, 'size=20');
  let 담은수 = 0;
  for (const 상품줄 of items.filter((p) => !p.soldOut)) {
    if (담은수 >= 개수) break;
    const 정보 = await 상품정보(api, 상품줄.id);
    await 장바구니담기(api, { productId: 정보.id, qty: 1, color: 정보.colors?.[0], size: 정보.sizes?.[0] });
    담은수 += 1;
  }
  return 담은수;
}

export async function 화면아래붙었나(칸: Locator): Promise<boolean> {
  return 칸.evaluate((el) => Math.round(el.getBoundingClientRect().bottom) >= window.innerHeight - 1);
}

export async function 내용위에겹쳤나(칸: Locator): Promise<boolean> {
  return 칸.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const 내용 = document.querySelector('main')?.getBoundingClientRect();
    if (내용 === undefined) return false;
    const 맨위 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.top < 내용.bottom && r.bottom > 내용.top && 맨위 !== null && el.contains(맨위);
  });
}

export async function 상자(칸: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const 자리 = await 칸.boundingBox();
  if (자리 === null) throw new Error('화면에 그려지지 않은 요소의 자리를 읽을 수 없다');
  return 자리;
}

export async function 설문이뜰때까지시간보내기(page: Page): Promise<void> {
  await new 홈화면(page).추천카드들.first().waitFor();
  await page.clock.runFor(15000);
}

export interface 가입자 {
  loginId: string;
  password: string;
}

export async function 가입자정리하기(api: APIRequestContext, 사람: 가입자): Promise<void> {
  const 응답 = await api.post('/api/auth/login', { data: { loginId: 사람.loginId, password: 사람.password, remember: false } });
  if (응답.ok()) await 탈퇴(api);
}

export async function 스크롤멈출때까지기다리기(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((끝) => {
        let 마지막 = window.scrollY;
        let 같은횟수 = 0;
        const 보기 = (): void => {
          if (window.scrollY === 마지막) 같은횟수 += 1;
          else {
            같은횟수 = 0;
            마지막 = window.scrollY;
          }
          if (같은횟수 >= 40) 끝();
          else requestAnimationFrame(보기);
        };
        requestAnimationFrame(보기);
      }),
  );
}

export async function 요청세션아이디(api: APIRequestContext): Promise<string | null> {
  const 응답 = await api.get('/api/session');
  const 본문 = (await 응답.json()) as { user: { loginId: string } | null };
  return 본문.user === null ? null : 본문.user.loginId;
}

export function 가입본문(정보: 회원정보): Record<string, unknown> {
  return {
    loginId: 정보.loginId,
    password: 정보.password,
    passwordConfirm: 정보.password,
    name: 정보.name,
    email: 정보.email,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}
