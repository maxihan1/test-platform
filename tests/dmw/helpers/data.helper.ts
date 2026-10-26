import type { APIRequestContext } from '@playwright/test';

import { 오늘부터, 요일 } from './common-tools.helper.js';

export interface 상품 {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate: number;
  salePrice: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldOut: boolean;
  summary: string;
}

export interface 상품상세 extends 상품 {
  colors: string[];
  sizes: string[];
}

export interface 장바구니줄 {
  id: number;
  productId: number;
  name: string;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
  maxQty: number;
  soldOut: boolean;
}

async function 몸<T>(res: { ok(): boolean; status(): number; text(): Promise<string>; json(): Promise<unknown> }, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 요청이 실패했다: ${res.status()} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function 글만들기(요청: APIRequestContext, 글: { title: string; content: string; category?: string }): Promise<number> {
  const res = await 요청.post('/api/posts', { data: { category: 글.category ?? '자유', title: 글.title, content: 글.content, images: [] } });
  return (await 몸<{ id: number }>(res, '글 만들기')).id;
}

export async function 글지우기(요청: APIRequestContext, 글번호: number): Promise<void> {
  const res = await 요청.delete(`/api/posts/${글번호}`);
  if (!res.ok() && res.status() !== 404) throw new Error(`글 지우기 요청이 실패했다: ${res.status()}`);
}

export async function 댓글달기(요청: APIRequestContext, 글번호: number, content: string, parentId?: number): Promise<number> {
  const res = await 요청.post(`/api/posts/${글번호}/comments`, { data: parentId === undefined ? { content } : { content, parentId } });
  return (await 몸<{ id: number }>(res, '댓글 달기')).id;
}

export async function 상품목록(요청: APIRequestContext): Promise<상품[]> {
  const res = await 요청.get('/api/products?page=1&size=100');
  return (await 몸<{ items: 상품[] }>(res, '상품 목록')).items;
}

export async function 상품읽기(요청: APIRequestContext, 상품번호: number): Promise<상품상세> {
  return 몸<상품상세>(await 요청.get(`/api/products/${상품번호}`), '상품 상세');
}

export async function 옵션없는상품(요청: APIRequestContext, 최소재고 = 10): Promise<상품상세> {
  for (const 하나 of await 상품목록(요청)) {
    if (하나.soldOut || 하나.stock < 최소재고) continue;
    const 상세 = await 상품읽기(요청, 하나.id);
    if (상세.colors.length === 0 && 상세.sizes.length === 0) return 상세;
  }
  throw new Error('옵션 없는 상품을 찾지 못했다');
}

export async function 옵션있는상품(요청: APIRequestContext, 최소재고 = 10): Promise<상품상세> {
  for (const 하나 of await 상품목록(요청)) {
    if (하나.soldOut || 하나.stock < 최소재고) continue;
    const 상세 = await 상품읽기(요청, 하나.id);
    if (상세.colors.length > 0 && 상세.sizes.length > 0) return 상세;
  }
  throw new Error('색상과 사이즈를 고르는 상품을 찾지 못했다');
}

export async function 품절상품(요청: APIRequestContext): Promise<상품> {
  const 찾음 = (await 상품목록(요청)).find((하나) => 하나.soldOut);
  if (찾음 === undefined) throw new Error('품절 상품을 찾지 못했다');
  return 찾음;
}

export async function 장바구니(요청: APIRequestContext): Promise<장바구니줄[]> {
  return (await 몸<{ items: 장바구니줄[] }>(await 요청.get('/api/cart'), '장바구니 조회')).items;
}

export async function 장바구니담기(요청: APIRequestContext, 줄: { productId: number; qty?: number; color?: string; size?: string }): Promise<number> {
  const res = await 요청.post('/api/cart', { data: { productId: 줄.productId, color: 줄.color ?? '', size: 줄.size ?? '', qty: 줄.qty ?? 1 } });
  return (await 몸<{ id: number }>(res, '장바구니 담기')).id;
}

export async function 장바구니비우기(요청: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니(요청)) {
    const res = await 요청.delete(`/api/cart/${줄.id}`);
    if (!res.ok()) throw new Error(`장바구니 줄 지우기 요청이 실패했다: ${res.status()}`);
  }
}

export function 배송희망일(최소일 = 3): string {
  for (let 일 = 최소일; 일 <= 14; 일 += 1) {
    const 날짜 = 오늘부터(일);
    if (요일(날짜) !== 0) return 날짜;
  }
  throw new Error('일요일이 아닌 배송 희망일을 찾지 못했다');
}

export const 기본배송정보 = {
  receiver: '홍길동',
  phone: '01012345678',
  zipcode: '06236',
  address: '서울 강남구 테헤란로 123',
  detail: '101호',
  request: '',
};

export async function 주문만들기(요청: APIRequestContext, 장바구니줄번호들: number[], 쿠폰 = ''): Promise<{ id: string; total: number }> {
  const res = await 요청.post('/api/orders', {
    data: {
      shipping: { ...기본배송정보, deliveryDate: 배송희망일() },
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: 쿠폰,
      cartItemIds: 장바구니줄번호들,
    },
  });
  return 몸<{ id: string; total: number }>(res, '주문');
}

export async function 상품하나주문(요청: APIRequestContext, 상품번호: number, qty = 1): Promise<{ id: string; total: number }> {
  const 줄번호 = await 장바구니담기(요청, { productId: 상품번호, qty });
  return 주문만들기(요청, [줄번호]);
}

export async function 문의등록(요청: APIRequestContext, 문의: { type?: string; title: string; content: string }): Promise<void> {
  const res = await 요청.post('/api/inquiries', { data: { type: 문의.type ?? '기타', title: 문의.title, content: 문의.content, fileName: '', fileData: '', emailNotify: false } });
  if (!res.ok()) throw new Error(`문의 등록 요청이 실패했다: ${res.status()} ${await res.text()}`);
}
