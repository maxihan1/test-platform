import type { APIRequestContext, Page } from '@playwright/test';

import { 로그인요청, 임시회원로그인, type 임시회원 } from './account.component.js';
import { 가짜장바구니응답, 내주문번호들, 장바구니담기, 주문취소 } from './data.component.js';

export interface 서버상품 {
  id: number;
  name: string;
  category: string;
  price: number;
  salePrice: number;
  soldOut: boolean;
  reviewCount: number;
}

export interface 문의 {
  question: string;
  answer: string;
}

export interface 상품자세히 {
  id: number;
  name: string;
  salePrice: number;
  stock: number;
  reviewCount: number;
  colors: string[];
  sizes: string[];
  qna: 문의[];
}

export interface 붙잡은응답 {
  보내기(): Promise<void>;
  풀기(): Promise<void>;
}

export const 추가상품번호 = {
  캐시미어머플러: 25,
} as const;

const 장바구니주소 = (url: URL): boolean => url.pathname === '/api/cart';
const 상품목록주소 = (url: URL): boolean => url.pathname === '/api/products';
const 리뷰주소 = (url: URL): boolean => /^\/api\/products\/\d+\/reviews$/.test(url.pathname);
const 자동완성주소 = (url: URL): boolean => url.pathname === '/api/products/suggest';

export function 원(금액: number): string {
  return `${금액.toLocaleString('ko-KR')}원`;
}

export async function 전체상품(api: APIRequestContext): Promise<서버상품[]> {
  const res = await api.get('/api/products?size=100');
  if (!res.ok()) throw new Error(`상품 목록 요청이 실패했다: ${res.status()}`);
  const { items } = (await res.json()) as { items: 서버상품[] };
  return items;
}

export async function 상품자세히조회(api: APIRequestContext, 번호: number): Promise<상품자세히> {
  const res = await api.get(`/api/products/${번호}`);
  if (!res.ok()) throw new Error(`상품 상세 요청이 실패했다: ${res.status()}`);
  return (await res.json()) as 상품자세히;
}

export async function 로그인한아이디(api: APIRequestContext): Promise<string> {
  const res = await api.get('/api/session');
  const { user } = (await res.json()) as { user: { loginId: string } | null };
  return user?.loginId ?? '';
}

export async function 회원과장바구니(api: APIRequestContext, 상품번호들: number[]): Promise<임시회원> {
  const 회원 = await 임시회원로그인(api);
  for (const id of 상품번호들) await 장바구니담기(api, id);
  return 회원;
}

export async function 회원정리(api: APIRequestContext, 회원: 임시회원): Promise<void> {
  if ((await 로그인한아이디(api)) !== 회원.loginId) {
    const 로그인 = await 로그인요청(api, 회원.loginId, 회원.password);
    if (로그인.status() !== 200) return;
  }
  for (const id of await 내주문번호들(api)) await 주문취소(api, id);
  await api.delete('/api/me');
}

export async function 장바구니응답걸기(page: Page, 상품금액: number): Promise<void> {
  await page.context().route(장바구니주소, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(가짜장바구니응답(상품금액)) });
  });
}

export async function 장바구니응답풀기(page: Page): Promise<void> {
  await page.context().unroute(장바구니주소);
}

export async function 상품목록응답붙잡기(page: Page): Promise<붙잡은응답> {
  let 놓기: () => void = () => undefined;
  const 신호 = new Promise<void>((끝) => {
    놓기 = 끝;
  });
  await page.context().route(상품목록주소, async (route) => {
    await 신호;
    await route.continue();
  });
  return {
    보내기: async () => {
      놓기();
    },
    풀기: async () => {
      놓기();
      await page.context().unroute(상품목록주소);
    },
  };
}

export async function 리뷰응답실패걸기(page: Page): Promise<void> {
  await page.context().route(리뷰주소, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요' }),
    });
  });
}

export async function 리뷰응답풀기(page: Page): Promise<void> {
  await page.context().unroute(리뷰주소);
}

export async function 자동완성응답걸기(page: Page, 이름들: string[]): Promise<void> {
  await page.context().route(자동완성주소, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: 이름들.map((name, i) => ({ id: i + 1, name })) }),
    });
  });
}

export async function 자동완성응답풀기(page: Page): Promise<void> {
  await page.context().unroute(자동완성주소);
}
