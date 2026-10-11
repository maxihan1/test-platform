import { request } from '@playwright/test';
import type { APIRequestContext, Page, Route } from '@playwright/test';

import { 새회원으로로그인, 탈퇴 } from './account.helper.js';
import type { 회원정보 } from './account.helper.js';
import { 날짜글, 상품목록, 상품정보, 일요일아닌배송일, 장바구니담기, 주문취소, 주문하기 } from './shop.helper.js';
import type { 상품 } from './shop.helper.js';

export interface 상품조건 {
  최소재고?: number;
  최대재고?: number;
  최소가격?: number;
  최대가격?: number;
}

export interface 담은상품 {
  상품: 상품;
  줄번호: number;
  수량: number;
  재고전: number;
}

interface 상품상세 extends 상품 {
  maxQty?: number;
}

export async function 상품고르기(api: APIRequestContext, 조건: 상품조건 = {}): Promise<상품> {
  const { items } = await 상품목록(api);
  const 후보 = items.filter(
    (p) =>
      !p.soldOut &&
      p.stock >= (조건.최소재고 ?? 8) &&
      p.stock <= (조건.최대재고 ?? Number.MAX_SAFE_INTEGER) &&
      p.salePrice >= (조건.최소가격 ?? 0) &&
      p.salePrice <= (조건.최대가격 ?? Number.MAX_SAFE_INTEGER),
  );
  if (후보.length === 0) throw new Error(`조건에 맞는 상품이 없다: ${JSON.stringify(조건)}`);
  return 후보[Math.floor(Math.random() * 후보.length)] as 상품;
}

export async function 상품담기(api: APIRequestContext, 조건: 상품조건 = {}, 수량: number | '재고전부' = 1): Promise<담은상품> {
  const 고른 = await 상품고르기(api, 조건);
  const 상세 = (await 상품정보(api, 고른.id)) as 상품상세;
  const 담을수량 = 수량 === '재고전부' ? 상세.stock : Math.min(수량, 상세.maxQty ?? 수량);
  const 줄번호 = await 장바구니담기(api, { productId: 상세.id, qty: 담을수량, color: 상세.colors?.[0], size: 상세.sizes?.[0] });
  return { 상품: 상세, 줄번호, 수량: 담을수량, 재고전: 상세.stock };
}

export async function 상품번호로담기(api: APIRequestContext, 상품번호: number, 수량 = 1): Promise<number> {
  const 상세 = (await 상품정보(api, 상품번호)) as 상품상세;
  return 장바구니담기(api, { productId: 상세.id, qty: 수량, color: 상세.colors?.[0], size: 상세.sizes?.[0] });
}

export async function 재고초과요청본문(api: APIRequestContext): Promise<Record<string, unknown>> {
  const 고른 = await 상품고르기(api, { 최소재고: 1 });
  const 상세 = await 상품정보(api, 고른.id);
  return 주문요청본문({ direct: { productId: 상세.id, qty: 상세.stock + 1, color: 상세.colors?.[0] ?? '', size: 상세.sizes?.[0] ?? '' } });
}

export function 주문요청본문(
  대상: { cartItemIds: number[] } | { direct: { productId: number; qty: number; color: string; size: string } },
): Record<string, unknown> {
  return {
    shipping: { receiver: '임시회원', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '5층', request: '', deliveryDate: 일요일아닌배송일() },
    payment: { method: '계좌이체', cardCompany: '', installment: '' },
    couponId: '',
    ...대상,
  };
}

export async function 주문만들기(api: APIRequestContext, 조건: 상품조건 = {}): Promise<{ 주문번호: string; 총액: number; 담음: 담은상품 }> {
  const 담음 = await 상품담기(api, 조건);
  const { id, total } = await 주문하기(api, [담음.줄번호]);
  return { 주문번호: id, 총액: total, 담음 };
}

export async function 임시회원과주문(api: APIRequestContext, 조건: 상품조건 = {}): Promise<{ 정보: 회원정보; 주문번호: string; 총액: number; 담음: 담은상품 }> {
  const 정보 = await 새회원으로로그인(api);
  const 만든 = await 주문만들기(api, 조건);
  return { 정보, ...만든 };
}

export interface 둘째회원 {
  api: APIRequestContext;
  정보: 회원정보;
}

export async function 둘째회원만들기(): Promise<둘째회원> {
  const api = await request.newContext({ baseURL: process.env.PLATFORM_BASE_URL });
  const 정보 = await 새회원으로로그인(api);
  return { api, 정보 };
}

export async function 둘째회원정리(둘째: 둘째회원 | undefined, 주문번호들: string[]): Promise<void> {
  if (둘째 === undefined) return;
  for (const 번호 of 주문번호들) await 주문취소(둘째.api, 번호);
  await 탈퇴(둘째.api);
  await 둘째.api.dispose();
}

export function 숫자만(글: string): number {
  return Number(글.replace(/[^\d]/g, ''));
}

export function 닫힘기다리개(창: Page, 제한 = 5000): Promise<boolean> {
  if (창.isClosed()) return Promise.resolve(true);
  return Promise.race([
    창.waitForEvent('close').then(() => true),
    new Promise<boolean>((끝) => {
      setTimeout(() => {
        끝(창.isClosed());
      }, 제한);
    }),
  ]);
}

export function 한달전날짜(): string {
  const 날 = new Date();
  날.setHours(12, 0, 0, 0);
  날.setMonth(날.getMonth() - 1);
  return 날짜글(날);
}

export const 모킹줄번호 = 1;

const 장바구니주소 = /\/api\/cart(\?.*)?$/;
const 주문목록주소 = /\/api\/orders(\?.*)?$/;

export async function 장바구니모킹(page: Page, 상품금액: number): Promise<() => Promise<void>> {
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{ id: 모킹줄번호, productId: 34, name: 'USB-C 허브', color: '', size: '', qty: 1, unitPrice: 상품금액, maxQty: 10, soldOut: false }],
      }),
    });
  };
  await page.context().route(장바구니주소, 처리);
  return async () => {
    await page.context().unroute(장바구니주소, 처리);
  };
}

export interface 주문줄 {
  id: string;
  createdAt: number;
  status: string;
  total: number;
  title: string;
}

export async function 주문목록모킹(page: Page, 줄들: 주문줄[]): Promise<() => Promise<void>> {
  const 처리 = async (route: Route): Promise<void> => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: 줄들, total: 줄들.length, page: 1, size: 줄들.length }),
    });
  };
  await page.context().route(주문목록주소, 처리);
  return async () => {
    await page.context().unroute(주문목록주소, 처리);
  };
}

export async function 주문목록실패모킹(page: Page): Promise<() => Promise<void>> {
  const 처리 = async (route: Route): Promise<void> => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
  };
  await page.context().route(주문목록주소, 처리);
  return async () => {
    await page.context().unroute(주문목록주소, 처리);
  };
}
