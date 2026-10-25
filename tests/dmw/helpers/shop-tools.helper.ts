import type { APIRequestContext, Locator, Page, Route } from '@playwright/test';

import type { 배송정보 } from '../pages/checkout.page.js';
import { 날짜글, 요일 } from './common-tools.helper.js';
import type { 장바구니줄, 상품, 상품상세 } from './data.helper.js';
import { 기본배송정보, 배송희망일, 상품목록, 상품읽기 } from './data.helper.js';

export interface 문의 {
  question: string;
  answer: string;
}

export interface 가짜줄값 {
  id?: number;
  productId?: number;
  name?: string;
  color?: string;
  size?: string;
  qty?: number;
  unitPrice: number;
}

export async function 첫화면상품들(요청: APIRequestContext): Promise<상품[]> {
  const res = await 요청.get('/api/products?maxPrice=500000&sort=recommend&page=1&size=12');
  if (!res.ok()) throw new Error(`상품 목록 첫 쪽 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 상품[] }).items;
}

export async function 할인상품(요청: APIRequestContext): Promise<상품> {
  const 찾음 = (await 첫화면상품들(요청)).find((하나) => 하나.discountRate > 0 && !하나.soldOut);
  if (찾음 === undefined) throw new Error('첫 화면에 할인 상품이 없다');
  return 찾음;
}

function 섞기<T>(목록: T[]): T[] {
  const 복사 = [...목록];
  for (let i = 복사.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [복사[i], 복사[j]] = [복사[j], 복사[i]];
  }
  return 복사;
}

export async function 넉넉한상품(요청: APIRequestContext, 옵션있음: boolean, 최소재고 = 10): Promise<상품상세> {
  for (const 하나 of 섞기(await 상품목록(요청))) {
    if (하나.soldOut || 하나.stock < 최소재고 || 하나.id === 12) continue;
    const 상세 = await 상품읽기(요청, 하나.id);
    const 있다 = 상세.colors.length > 0 && 상세.sizes.length > 0;
    const 없다 = 상세.colors.length === 0 && 상세.sizes.length === 0;
    if (옵션있음 ? 있다 : 없다) return 상세;
  }
  throw new Error('조건에 맞는 상품을 찾지 못했다');
}

export async function 상품문의읽기(요청: APIRequestContext, 상품번호: number): Promise<문의[]> {
  const res = await 요청.get(`/api/products/${상품번호}`);
  if (!res.ok()) throw new Error(`상품 상세 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { qna: 문의[] }).qna;
}

export async function 상품담기(요청: APIRequestContext, 상품: 상품상세, qty = 1): Promise<number> {
  const res = await 요청.post('/api/cart', {
    data: { productId: 상품.id, color: 상품.colors[0] ?? '', size: 상품.sizes[0] ?? '', qty },
  });
  if (!res.ok()) throw new Error(`장바구니 담기 요청이 실패했다: ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { id: number }).id;
}

export async function 장바구니줄읽기(요청: APIRequestContext): Promise<장바구니줄[]> {
  const res = await 요청.get('/api/cart');
  if (!res.ok()) throw new Error(`장바구니 조회 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 장바구니줄[] }).items;
}

export async function 주문개수(요청: APIRequestContext): Promise<number> {
  const res = await 요청.get('/api/orders');
  if (!res.ok()) throw new Error(`주문 목록 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: unknown[] }).items.length;
}

export async function 주문번호들(요청: APIRequestContext): Promise<string[]> {
  const res = await 요청.get('/api/orders');
  if (!res.ok()) throw new Error(`주문 목록 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: { id: string }[] }).items.map((주문) => 주문.id);
}

export async function 주문지우기(요청: APIRequestContext, 번호: string): Promise<void> {
  const res = await 요청.post(`/api/orders/${encodeURIComponent(번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
  if (!res.ok() && res.status() !== 400 && res.status() !== 404) throw new Error(`주문 취소 요청이 실패했다: ${res.status()}`);
}

export async function 새주문모두취소(요청: APIRequestContext): Promise<void> {
  for (const 번호 of await 주문번호들(요청)) await 주문지우기(요청, 번호);
}

export async function 재고읽기(요청: APIRequestContext, 상품번호: number): Promise<number> {
  return (await 상품읽기(요청, 상품번호)).stock;
}

export function 가짜줄(값: 가짜줄값): 장바구니줄 {
  return {
    id: 값.id ?? 9001,
    productId: 값.productId ?? 1,
    name: 값.name ?? '시험 상품',
    color: 값.color ?? '',
    size: 값.size ?? '',
    qty: 값.qty ?? 1,
    unitPrice: 값.unitPrice,
    maxQty: 10,
    soldOut: false,
  };
}

function 장바구니조회인가(주소: string, 방식: string): boolean {
  return 방식 === 'GET' && /\/api\/cart(\?.*)?$/.test(주소);
}

export async function 장바구니목록가짜로돌리기(page: Page, 줄들: 장바구니줄[]): Promise<() => Promise<void>> {
  const 처리 = async (길: Route): Promise<void> => {
    if (!장바구니조회인가(길.request().url(), 길.request().method())) {
      await 길.fallback();
      return;
    }
    await 길.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: 줄들 }) });
  };
  await page.context().route(/\/api\/cart(\?.*)?$/, 처리);
  return async () => {
    await page.context().unroute(/\/api\/cart(\?.*)?$/, 처리);
  };
}

export async function 응답을오류로돌리기(page: Page, 주소꼴: RegExp, 방식: string, 상태: number, 몸: { code: string; message: string }): Promise<() => Promise<void>> {
  const 처리 = async (길: Route): Promise<void> => {
    if (길.request().method() !== 방식) {
      await 길.fallback();
      return;
    }
    await 길.fulfill({ status: 상태, contentType: 'application/json', body: JSON.stringify(몸) });
  };
  await page.context().route(주소꼴, 처리);
  return async () => {
    await page.context().unroute(주소꼴, 처리);
  };
}

export interface 늦춘응답 {
  풀기: () => void;
  끝내기: () => Promise<void>;
}

export async function 응답늦추기(page: Page, 주소꼴: RegExp): Promise<늦춘응답> {
  let 풀기 = (): void => undefined;
  const 문 = new Promise<void>((끝) => {
    풀기 = () => 끝();
  });
  const 처리 = async (길: Route): Promise<void> => {
    await 문;
    await 길.fallback();
  };
  await page.context().route(주소꼴, 처리);
  return {
    풀기,
    끝내기: async () => {
      풀기();
      await page.context().unroute(주소꼴, 처리);
    },
  };
}

export interface 바꿀수있는응답 {
  정상으로되돌리기: () => void;
  끝내기: () => Promise<void>;
}

export async function 처음에는오류로주다가되돌리기(page: Page, 주소꼴: RegExp, 상태: number, 몸: { code: string; message: string }): Promise<바꿀수있는응답> {
  let 오류로준다 = true;
  const 처리 = async (길: Route): Promise<void> => {
    if (!오류로준다) {
      await 길.fallback();
      return;
    }
    await 길.fulfill({ status: 상태, contentType: 'application/json', body: JSON.stringify(몸) });
  };
  await page.context().route(주소꼴, 처리);
  return {
    정상으로되돌리기: () => {
      오류로준다 = false;
    },
    끝내기: async () => {
      await page.context().unroute(주소꼴, 처리);
    },
  };
}

export function 요청을세기(page: Page, 주소꼴: RegExp, 방식?: string): { 개수: () => number; 끝내기: () => void } {
  let 센수 = 0;
  const 들음 = (요청: { url: () => string; method: () => string }): void => {
    if (주소꼴.test(요청.url()) && (방식 === undefined || 요청.method() === 방식)) 센수 += 1;
  };
  page.on('request', 들음);
  return {
    개수: () => 센수,
    끝내기: () => {
      page.off('request', 들음);
    },
  };
}

export async function 오늘을수요일로옮기기(page: Page): Promise<Date> {
  const 기준 = new Date();
  기준.setDate(기준.getDate() + ((3 - 기준.getDay() + 7) % 7));
  await page.clock.setFixedTime(기준);
  return 기준;
}

export function 기준일뒤(기준: Date, 일수: number): string {
  const 날 = new Date(기준);
  날.setDate(날.getDate() + 일수);
  return 날짜글(날);
}

export function 범위안의일요일뒤(): number {
  for (let 일 = 2; 일 <= 14; 일 += 1) {
    const 날 = new Date();
    날.setDate(날.getDate() + 일);
    if (요일(날짜글(날)) === 0) return 일;
  }
  throw new Error('2일 뒤부터 14일 뒤 사이에 일요일이 없다');
}

export function 빨간색인가(색: { r: number; g: number; b: number }): boolean {
  return 색.r >= 180 && 색.g <= 90 && 색.b <= 90;
}

export function 회색인가(색: { r: number; g: number; b: number }): boolean {
  return 색.r >= 60 && 색.r <= 200 && Math.abs(색.r - 색.g) <= 20 && Math.abs(색.g - 색.b) <= 30;
}

export async function 전체상품이름들(요청: APIRequestContext, 거름: (하나: 상품) => boolean = () => true): Promise<string[]> {
  return (await 상품목록(요청)).filter(거름).map((하나) => 하나.name);
}

export async function 정렬한첫쪽(요청: APIRequestContext, 정렬: string): Promise<상품[]> {
  const res = await 요청.get(`/api/products?maxPrice=500000&sort=${정렬}&page=1&size=12`);
  if (!res.ok()) throw new Error(`상품 목록 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 상품[] }).items;
}

export async function 넉넉한상품들(요청: APIRequestContext, 개수: number, 옵션있음: boolean, 최소재고 = 10): Promise<상품상세[]> {
  const 모음: 상품상세[] = [];
  for (const 하나 of 섞기(await 상품목록(요청))) {
    if (모음.length >= 개수) break;
    if (하나.soldOut || 하나.stock < 최소재고 || 하나.id === 12) continue;
    const 상세 = await 상품읽기(요청, 하나.id);
    const 있다 = 상세.colors.length > 0 && 상세.sizes.length > 0;
    const 없다 = 상세.colors.length === 0 && 상세.sizes.length === 0;
    if (옵션있음 ? 있다 : 없다) 모음.push(상세);
  }
  if (모음.length < 개수) throw new Error('조건에 맞는 상품을 충분히 찾지 못했다');
  return 모음;
}

export function 시험배송정보(희망일: string = 배송희망일()): 배송정보 {
  return { 받는분: 기본배송정보.receiver, 연락처: 기본배송정보.phone, 상세주소: 기본배송정보.detail, 희망일 };
}

export async function 나타나는가(대상: Locator, 제한 = 8000): Promise<boolean> {
  try {
    await 대상.waitFor({ timeout: 제한 });
    return true;
  } catch {
    return false;
  }
}
