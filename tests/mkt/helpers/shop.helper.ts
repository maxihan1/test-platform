import type { APIRequestContext, Page, Route } from '@playwright/test';
import type { 배송정보 } from '../pages/checkout.page.js';
import { 날짜글자, 며칠뒤, 배송가능일 } from './data.helper.js';

export interface 상품요약 {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate: number;
  salePrice: number;
  soldOut: boolean;
}

export interface 상품문의글 {
  question: string;
  answer: string;
}

export interface 가짜장바구니줄 {
  id: number;
  productId: number;
  name: string;
  unitPrice: number;
  qty: number;
}

export interface 붙잡은응답 {
  도착했을때까지: Promise<void>;
  풀기: () => void;
  거두기: () => Promise<void>;
}

export async function 전체상품(요청: APIRequestContext): Promise<상품요약[]> {
  const 응답 = await 요청.get('/api/products?maxPrice=500000&sort=recommend&page=1&size=40');
  if (응답.status() !== 200) throw new Error(`상품 목록 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { items: 상품요약[] }).items;
}

export async function 첫쪽할인상품(요청: APIRequestContext): Promise<상품요약> {
  const 응답 = await 요청.get('/api/products?maxPrice=500000&sort=recommend&page=1&size=12');
  if (응답.status() !== 200) throw new Error(`상품 목록 조회가 실패했다: ${응답.status()}`);
  const 찾음 = ((await 응답.json()) as { items: 상품요약[] }).items.find((상품) => 상품.discountRate > 0);
  if (!찾음) throw new Error('첫 쪽에 할인 상품이 없다');
  return 찾음;
}

export async function 품절상품(요청: APIRequestContext): Promise<상품요약> {
  const 찾음 = (await 전체상품(요청)).find((상품) => 상품.soldOut);
  if (!찾음) throw new Error('품절 상품이 없다');
  return 찾음;
}

export async function 상품문의(요청: APIRequestContext, 상품번호: number): Promise<상품문의글[]> {
  const 응답 = await 요청.get(`/api/products/${상품번호}`);
  if (응답.status() !== 200) throw new Error(`상품 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { qna: 상품문의글[] }).qna;
}

export async function 자동완성결과수(요청: APIRequestContext, 검색어: string): Promise<number> {
  const 응답 = await 요청.get(`/api/products/suggest?q=${encodeURIComponent(검색어)}`);
  if (응답.status() !== 200) throw new Error(`자동완성 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { items: unknown[] }).items.length;
}

export async function 서버주문수(요청: APIRequestContext): Promise<number> {
  const 응답 = await 요청.get('/api/orders');
  if (응답.status() !== 200) throw new Error(`주문 목록 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { total: number }).total;
}

export function 기본배송정보(희망일: string = 배송가능일(2)): 배송정보 {
  return { 받는분: '홍길동', 연락처: '01012345678', 우편번호: '06236', 주소: '서울 강남구 테헤란로 123', 상세주소: '101호', 배송희망일: 희망일 };
}

export function 다음월요일정오(): Date {
  const 오늘 = new Date();
  const 날 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate(), 12);
  날.setDate(날.getDate() + ((1 - 날.getDay() + 7) % 7));
  return 날;
}

export function 범위안일요일(): string {
  let 일수 = 2;
  while (며칠뒤(일수).getDay() !== 0) 일수 += 1;
  return 날짜글자(며칠뒤(일수));
}

export function 병렬칸번호(): number {
  return Number(process.env.TEST_PARALLEL_INDEX ?? '0');
}

export async function 응답붙잡기(page: Page, 맞는가: (주소: URL) => boolean): Promise<붙잡은응답> {
  let 풀기 = (): void => undefined;
  let 도착 = (): void => undefined;
  const 풀림 = new Promise<void>((끝) => {
    풀기 = 끝;
  });
  const 도착했을때까지 = new Promise<void>((끝) => {
    도착 = 끝;
  });
  const 처리 = async (route: Route): Promise<void> => {
    도착();
    await 풀림;
    await route.continue();
  };
  await page.context().route(맞는가, 처리);
  return {
    도착했을때까지,
    풀기,
    거두기: async () => {
      풀기();
      await page.context().unroute(맞는가, 처리);
    },
  };
}

export async function 장바구니응답가짜로(page: Page, 줄들: () => 가짜장바구니줄[]): Promise<() => Promise<void>> {
  const 맞는가 = (주소: URL): boolean => 주소.pathname === '/api/cart';
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const items = 줄들().map((줄) => ({ id: 줄.id, productId: 줄.productId, name: 줄.name, color: '', size: '', qty: 줄.qty, unitPrice: 줄.unitPrice, maxQty: 10, soldOut: false }));
    await route.fulfill({ json: { items } });
  };
  await page.context().route(맞는가, 처리);
  return () => page.context().unroute(맞는가, 처리);
}

export async function 장바구니응답서버오류로(page: Page): Promise<() => Promise<void>> {
  const 맞는가 = (주소: URL): boolean => 주소.pathname === '/api/cart';
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, json: { code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' } });
  };
  await page.context().route(맞는가, 처리);
  return () => page.context().unroute(맞는가, 처리);
}

export async function 리뷰응답앞에서실패시키기(page: Page, 실패횟수: number): Promise<() => Promise<void>> {
  const 맞는가 = (주소: URL): boolean => /^\/api\/products\/\d+\/reviews$/.test(주소.pathname);
  let 받은수 = 0;
  const 처리 = async (route: Route): Promise<void> => {
    받은수 += 1;
    if (받은수 > 실패횟수) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, json: { code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' } });
  };
  await page.context().route(맞는가, 처리);
  return () => page.context().unroute(맞는가, 처리);
}

export async function 주문응답재고부족으로(page: Page, 상품명: string): Promise<() => Promise<void>> {
  const 맞는가 = (주소: URL): boolean => 주소.pathname === '/api/orders';
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 409, json: { code: 'OUT_OF_STOCK', message: `재고가 부족한 상품이 있습니다: ${상품명}` } });
  };
  await page.context().route(맞는가, 처리);
  return () => page.context().unroute(맞는가, 처리);
}
