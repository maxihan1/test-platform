import type { APIRequestContext, BrowserContext, Locator, Page, Route } from '@playwright/test';

import { 장바구니화면 } from '../pages/cart.page.js';
import { 주문서화면, type 배송입력 } from '../pages/checkout.page.js';
import { 방해막기, 화면로그인 } from './account.helper.js';
import { 시험배송정보, 배송가능일 } from './order.helper.js';

export const 고정오늘 = new Date(2026, 9, 12, 12, 0, 0);

export const 옵션상품번호 = 1;
export const 옵션없는상품번호 = 20;

export interface 상품요약 {
  id: number;
  name: string;
  category: string;
  price: number;
  salePrice: number;
  soldOut: boolean;
  stock: number;
}

export interface 상품상세 extends 상품요약 {
  colors: string[];
  sizes: string[];
  qna: { question: string; answer: string }[];
  maxQty: number;
  reviewCount: number;
}

export function 날짜뒤(뒤: number, 기준: Date = new Date()): string {
  const d = new Date(기준.getTime());
  d.setDate(d.getDate() + 뒤);
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}`;
}

export function 일요일배송일(기준: Date = new Date()): string {
  for (let 뒤 = 2; 뒤 <= 14; 뒤 += 1) {
    const 날 = new Date(기준.getTime());
    날.setDate(날.getDate() + 뒤);
    if (날.getDay() === 0) return 날짜뒤(뒤, 기준);
  }
  throw new Error('2일 뒤부터 14일 뒤 사이에 일요일이 없다');
}

export function 정상배송입력(기준: Date = new Date()): 배송입력 {
  return {
    받는분: 시험배송정보.receiver,
    연락처: 시험배송정보.phone,
    우편번호: 시험배송정보.zipcode,
    주소: 시험배송정보.address,
    상세주소: 시험배송정보.detail,
    희망일: 배송가능일(3, 기준),
  };
}

export async function 전체상품읽기(req: APIRequestContext): Promise<상품요약[]> {
  const res = await req.get('/api/products?maxPrice=500000&size=100');
  if (!res.ok()) throw new Error(`상품 목록 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { items: 상품요약[] }).items;
}

export async function 상품읽기(req: APIRequestContext, 번호: number): Promise<상품상세> {
  const res = await req.get(`/api/products/${번호}`);
  if (!res.ok()) throw new Error(`상품 읽기 실패: ${res.status()}`);
  return (await res.json()) as 상품상세;
}

export async function 재고1상품(req: APIRequestContext): Promise<상품요약> {
  const 찾음 = (await 전체상품읽기(req)).find((p) => p.stock === 1 && !p.soldOut);
  if (찾음 === undefined) throw new Error('재고가 1인 상품이 없다');
  return 찾음;
}

export async function 품절상품들(req: APIRequestContext): Promise<상품요약[]> {
  return (await 전체상품읽기(req)).filter((p) => p.soldOut);
}

export async function 하나만맞는가격(req: APIRequestContext): Promise<number> {
  for (let 가격 = 0; 가격 <= 500000; 가격 += 10000) {
    const res = await req.get(`/api/products?maxPrice=${가격}&size=12`);
    const 개수 = ((await res.json()) as { total: number }).total;
    if (개수 === 1) return 가격;
  }
  throw new Error('상품이 하나만 맞는 최대 가격이 없다');
}

export async function 여섯개넘게맞는글자(req: APIRequestContext): Promise<string> {
  const 이름들 = (await 전체상품읽기(req)).map((p) => p.name);
  const 센다 = new Map<string, number>();
  for (const 이름 of 이름들) for (const 글자 of new Set(이름.replace(/\s/g, ''))) 센다.set(글자, (센다.get(글자) ?? 0) + 1);
  const 찾음 = [...센다.entries()].find(([글자, 개수]) => 개수 > 6 && /[가-힣]/.test(글자));
  if (찾음 === undefined) throw new Error('이름에 6개 넘게 들어간 글자가 없다');
  return 찾음[0];
}

export async function 내주문수(req: APIRequestContext): Promise<number> {
  const res = await req.get('/api/orders?period=all&size=100');
  if (!res.ok()) throw new Error(`주문 목록 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { total: number }).total;
}

export async function 내주문번호들(req: APIRequestContext): Promise<{ id: string; status: string }[]> {
  const res = await req.get('/api/orders?period=all&size=100');
  if (!res.ok()) throw new Error(`주문 목록 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { items: { id: string; status: string }[] }).items;
}

export async function 로그아웃(req: APIRequestContext): Promise<number> {
  const res = await req.post('/api/auth/logout');
  return res.status();
}

export async function 사라질때까지기다림(칸: Locator, 제한 = 5000): Promise<void> {
  await 칸.waitFor({ state: 'detached', timeout: 제한 }).catch(() => undefined);
}

export async function 보일때까지기다림(칸: Locator, 제한 = 5000): Promise<void> {
  await 칸.waitFor({ timeout: 제한 }).catch(() => undefined);
}

export async function 응답늦추기(context: BrowserContext, 패턴: RegExp): Promise<{ 놓기: () => void; 걸린수: () => number; 풀기: () => Promise<void> }> {
  let 놓기: () => void = () => undefined;
  const 신호 = new Promise<void>((끝) => {
    놓기 = 끝;
  });
  let 걸린 = 0;
  const 처리 = async (route: Route) => {
    걸린 += 1;
    await 신호;
    await route.continue();
  };
  await context.route(패턴, 처리);
  return { 놓기, 걸린수: () => 걸린, 풀기: () => context.unroute(패턴, 처리) };
}

export async function 첫응답만늦추기(context: BrowserContext, 패턴: RegExp): Promise<{ 놓기: () => void; 풀기: () => Promise<void> }> {
  let 놓기: () => void = () => undefined;
  const 신호 = new Promise<void>((끝) => {
    놓기 = 끝;
  });
  let 걸린 = 0;
  const 처리 = async (route: Route) => {
    걸린 += 1;
    if (걸린 === 1) await 신호;
    await route.continue();
  };
  await context.route(패턴, 처리);
  return { 놓기, 풀기: () => context.unroute(패턴, 처리) };
}

export async function 가격맞춘장바구니걸기(context: BrowserContext, 가격: { 값: number }): Promise<() => Promise<void>> {
  const 패턴 = /\/api\/cart(\?.*)?$/;
  const 처리 = async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const 줄 = { id: 1, productId: 34, name: 'USB-C 허브', color: '', size: '', qty: 1, unitPrice: 가격.값, maxQty: 10, soldOut: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [줄] }) });
  };
  await context.route(패턴, 처리);
  return () => context.unroute(패턴, 처리);
}

export async function 상품가격맞춰걸기(context: BrowserContext, 번호: number, 판매가: number): Promise<() => Promise<void>> {
  const 패턴 = new RegExp(`/api/products/${번호}$`);
  const 처리 = async (route: Route) => {
    const 원래 = await route.fetch();
    const 본문 = (await 원래.json()) as Record<string, unknown>;
    await route.fulfill({ response: 원래, json: { ...본문, price: 판매가, salePrice: 판매가, discountRate: 0 } });
  };
  await context.route(패턴, 처리);
  return () => context.unroute(패턴, 처리);
}

export async function 장바구니로주문서열기(page: Page, 아이디: string, 비밀번호: string): Promise<void> {
  await 방해막기(page);
  await 화면로그인(page, 아이디, 비밀번호);
  const 장바구니 = new 장바구니화면(page);
  await 장바구니.열기();
  await 장바구니.주문하기누르기();
  await new 주문서화면(page).받는분.waitFor();
}

export async function 결제수단단계로가기(주문서: 주문서화면, 입력: 배송입력): Promise<void> {
  await 주문서.배송정보채우기(입력);
  await 주문서.다음누르기();
  await 주문서.결제수단단계.waitFor();
}

export async function 최종확인단계로가기(주문서: 주문서화면, 입력: 배송입력, 결제수단 = '계좌이체'): Promise<void> {
  await 결제수단단계로가기(주문서, 입력);
  await 주문서.결제수단고르기(결제수단);
  await 주문서.다음누르기();
  await 주문서.최종확인단계.waitFor();
}
