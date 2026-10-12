import type { APIRequestContext } from '@playwright/test';

export interface 장바구니줄 {
  id: number;
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
}

interface 상품 {
  id: number;
  soldOut: boolean;
  stock: number;
  colors?: string[];
}

export async function 장바구니보기(api: APIRequestContext): Promise<장바구니줄[]> {
  const res = await api.get('/api/cart');
  if (!res.ok()) throw new Error(`장바구니 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: 장바구니줄[] }).items;
}

async function 옵션없는상품들(api: APIRequestContext, 개수: number): Promise<number[]> {
  const res = await api.get('/api/products?size=100');
  if (!res.ok()) throw new Error(`상품 목록 조회 실패: ${String(res.status())}`);
  const 고른것: number[] = [];
  for (const 후보 of ((await res.json()) as { items: 상품[] }).items.filter((p) => !p.soldOut && p.stock > 10)) {
    const 상세 = await api.get(`/api/products/${String(후보.id)}`);
    if (!상세.ok()) throw new Error(`상품 조회 실패: ${String(상세.status())}`);
    const 색 = ((await 상세.json()) as 상품).colors;
    if (색 === undefined || 색.length === 0) 고른것.push(후보.id);
    if (고른것.length === 개수) return 고른것;
  }
  throw new Error('옵션 없고 재고가 넉넉한 상품이 모자란다');
}

export async function 상품두줄담기(api: APIRequestContext): Promise<number[]> {
  const 줄번호들: number[] = [];
  for (const productId of await 옵션없는상품들(api, 2)) {
    const res = await api.post('/api/cart', { data: { productId, qty: 1 } });
    if (res.status() !== 201 && res.status() !== 200) throw new Error(`장바구니 담기 실패: ${String(res.status())} ${await res.text()}`);
    줄번호들.push(((await res.json()) as { id: number }).id);
  }
  return 줄번호들;
}

export function 주문서주소(줄번호들: number[]): string {
  return `/checkout?items=${줄번호들.join(',')}`;
}
