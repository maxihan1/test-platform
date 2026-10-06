import type { APIRequestContext, APIResponse } from '@playwright/test';

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

export interface 상품 {
  id: number;
  name: string;
  category: string;
  price: number;
  salePrice: number;
  stock: number;
  soldOut: boolean;
  colors: string[];
  sizes: string[];
}

export const 상품번호 = {
  니트가디건: 1,
  USB허브: 34,
  콜드브루: 12,
  모니터: 26,
} as const;

async function 본문<T>(응답: Promise<APIResponse>, 무엇: string): Promise<T> {
  const res = await 응답;
  if (!res.ok()) throw new Error(`${무엇} 요청이 실패했다: ${res.status()} ${await res.text()}`);
  return (res.status() === 204 ? null : await res.json()) as T;
}

export async function 상품조회(api: APIRequestContext, id: number): Promise<상품> {
  return 본문<상품>(api.get(`/api/products/${id}`), '상품 상세');
}

export async function 품절상품번호(api: APIRequestContext): Promise<number> {
  const { items } = await 본문<{ items: 상품[] }>(api.get('/api/products?size=100'), '상품 목록');
  const 품절 = items.find((p) => p.soldOut);
  if (!품절) throw new Error('품절 상품이 없다');
  return 품절.id;
}

export async function 장바구니조회(api: APIRequestContext): Promise<장바구니줄[]> {
  const { items } = await 본문<{ items: 장바구니줄[] }>(api.get('/api/cart'), '장바구니 조회');
  return items;
}

export async function 장바구니비우기(api: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니조회(api)) await 본문(api.delete(`/api/cart/${줄.id}`), '장바구니 삭제');
}

export async function 장바구니담기(api: APIRequestContext, productId: number, qty = 1): Promise<void> {
  const p = await 상품조회(api, productId);
  await 본문(
    api.post('/api/cart', { data: { productId, color: p.colors[0] ?? '', size: p.sizes[0] ?? '', qty } }),
    '장바구니 담기',
  );
}

export interface 글 {
  id: number;
}

export async function 글만들기(
  api: APIRequestContext,
  내용: { title: string; content: string; category?: string; images?: string[] },
): Promise<글> {
  return 본문<글>(
    api.post('/api/posts', { data: { category: 내용.category ?? '자유', title: 내용.title, content: 내용.content, images: 내용.images ?? [] } }),
    '글 작성',
  );
}

export async function 글지우기(api: APIRequestContext, id: number): Promise<void> {
  await api.delete(`/api/posts/${id}`);
}

export async function 댓글달기(api: APIRequestContext, postId: number, content: string, parentId: number | null = null): Promise<{ id: number }> {
  return 본문<{ id: number }>(api.post(`/api/posts/${postId}/comments`, { data: { content, parentId } }), '댓글 작성');
}

export function 배송정보(내일부터 = 3) {
  const 날 = new Date(Date.now() + 내일부터 * 86_400_000);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return {
    receiver: '테스트 수령인',
    phone: '01012345678',
    zipcode: '06234',
    address: '서울 강남구 테헤란로 123',
    detail: '5층',
    request: '',
    deliveryDate: `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`,
  };
}

export async function 장바구니주문(api: APIRequestContext, couponId = ''): Promise<{ id: string; total: number }> {
  const 줄들 = await 장바구니조회(api);
  return 본문<{ id: string; total: number }>(
    api.post('/api/orders', {
      data: {
        shipping: 배송정보(),
        payment: { method: '계좌이체', cardCompany: '', installment: '' },
        couponId,
        cartItemIds: 줄들.map((줄) => 줄.id),
      },
    }),
    '주문',
  );
}

export async function 주문취소(api: APIRequestContext, id: string): Promise<void> {
  await api.post(`/api/orders/${encodeURIComponent(id)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
}

export async function 내주문번호들(api: APIRequestContext): Promise<string[]> {
  const { items } = await 본문<{ items: { id: string }[] }>(api.get('/api/orders?period=all'), '주문 목록');
  return items.map((o) => o.id);
}

export async function 읽지않은알림수(api: APIRequestContext): Promise<number> {
  const { unread } = await 본문<{ unread: number }>(api.get('/api/notifications'), '알림 목록');
  return unread;
}

export function 가짜장바구니응답(상품금액: number): { items: 장바구니줄[] } {
  return {
    items: [{ id: 990001, productId: 상품번호.USB허브, name: 'USB-C 허브', color: '', size: '', qty: 1, unitPrice: 상품금액, maxQty: 10, soldOut: false }],
  };
}
