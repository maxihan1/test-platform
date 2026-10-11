import type { APIRequestContext } from '@playwright/test';

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

export async function 장바구니읽기(req: APIRequestContext): Promise<장바구니줄[]> {
  const res = await req.get('/api/cart');
  if (!res.ok()) throw new Error(`장바구니 읽기 실패: ${res.status()}`);
  const body = (await res.json()) as { items: 장바구니줄[] };
  return body.items;
}

export async function 장바구니담기(req: APIRequestContext, 줄: { productId: number; color?: string; size?: string; qty: number }): Promise<number> {
  const res = await req.post('/api/cart', { data: { productId: 줄.productId, color: 줄.color ?? '', size: 줄.size ?? '', qty: 줄.qty } });
  return res.status();
}

export async function 장바구니비우기(req: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니읽기(req)) await req.delete(`/api/cart/${줄.id}`);
}

const 같은줄 = (a: 장바구니줄, b: 장바구니줄) => a.productId === b.productId && a.color === b.color && a.size === b.size;

export async function 장바구니되돌리기(req: APIRequestContext, 처음: 장바구니줄[]): Promise<void> {
  const 지금 = await 장바구니읽기(req);
  for (const 줄 of 지금) {
    const 원래 = 처음.find((x) => 같은줄(x, 줄));
    if (원래 === undefined) await req.delete(`/api/cart/${줄.id}`);
    else if (원래.qty !== 줄.qty) await req.patch(`/api/cart/${줄.id}`, { data: { qty: 원래.qty } });
  }
  for (const 원래 of 처음) {
    if (!지금.some((x) => 같은줄(x, 원래))) await 장바구니담기(req, 원래);
  }
}
