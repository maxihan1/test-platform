import type { Page } from '@playwright/test';

export type 주문상태 = '결제완료' | '배송중' | '배송완료' | '주문취소';

export interface 운영상품 {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate: number;
  salePrice: number;
  stock: number;
}

async function 부름<T>(page: Page, method: 'GET' | 'POST' | 'PUT', url: string, data?: unknown): Promise<T> {
  const res = await page.request.fetch(url, { method, ...(data === undefined ? {} : { data }) });
  if (!res.ok()) throw new Error(`${method} ${url} 실패 ${res.status()} ${await res.text()}`);
  return (res.status() === 204 ? null : await res.json()) as T;
}

export async function 회원번호(page: Page, loginId: string): Promise<number> {
  const r = await 부름<{ items: { id: number; loginId: string }[] }>(page, 'GET', `/api/ops/users?q=${encodeURIComponent(loginId)}&status=&page=1&size=20`);
  const 회원 = r.items.find((u) => u.loginId === loginId);
  if (!회원) throw new Error(`운영툴 회원 목록에 ${loginId} 가 없다`);
  return 회원.id;
}

export async function 회원조작(page: Page, userId: number, kind: 'lock' | 'unlock' | 'withdraw'): Promise<void> {
  await 부름(page, 'POST', `/api/ops/users/${userId}/${kind}`);
}

export interface 시험데이터칸 {
  결제완료?: number;
  배송중?: number;
  배송완료?: number;
  주문취소?: number;
  cart?: number | null;
  notifications?: number;
}

export async function 시험데이터만들기(page: Page, loginId: string, 칸: 시험데이터칸): Promise<{ orderIds: string[]; summary: string }> {
  return 부름(page, 'POST', '/api/ops/fixtures', {
    loginId,
    orders: { 결제완료: 칸.결제완료 ?? 0, 배송중: 칸.배송중 ?? 0, 배송완료: 칸.배송완료 ?? 0, 주문취소: 칸.주문취소 ?? 0 },
    cart: 칸.cart ?? null,
    notifications: 칸.notifications ?? 0,
  });
}

export async function 주문상태바꾸기(page: Page, orderId: string, status: 주문상태): Promise<void> {
  await 부름(page, 'PUT', `/api/ops/orders/${encodeURIComponent(orderId)}/status`, { status });
}

export async function 주문상세읽기(page: Page, orderId: string): Promise<{ status: string; lines: { productId?: number; name: string; qty: number }[]; payment: { method: string }; shipping: { address: string }; cancel?: { reason: string } }> {
  return 부름(page, 'GET', `/api/ops/orders/${encodeURIComponent(orderId)}`);
}

export async function 상품목록(page: Page, q = ''): Promise<운영상품[]> {
  const r = await 부름<{ items: 운영상품[] }>(page, 'GET', `/api/ops/products?category=&q=${encodeURIComponent(q)}`);
  return r.items;
}

export async function 상품고치기(page: Page, 상품: Pick<운영상품, 'id' | 'price' | 'discountRate' | 'stock'>): Promise<void> {
  await 부름(page, 'PUT', `/api/ops/products/${상품.id}`, { price: 상품.price, discountRate: 상품.discountRate, stock: 상품.stock });
}

export async function 글숨기기(page: Page, postId: number, hidden: boolean): Promise<void> {
  await 부름(page, 'PUT', `/api/ops/posts/${postId}/hidden`, { hidden });
}

export async function 댓글숨기기(page: Page, commentId: number, hidden: boolean): Promise<void> {
  await 부름(page, 'PUT', `/api/ops/comments/${commentId}/hidden`, { hidden });
}

export async function 공지쓰기(page: Page, title: string, content: string): Promise<{ id: number }> {
  return 부름(page, 'POST', '/api/ops/notices', { title, content });
}

export async function 알림보내기(page: Page, loginId: string, message: string): Promise<void> {
  await 부름(page, 'POST', '/api/ops/notifications', { loginId, message });
}

export async function 쿠폰주기(page: Page, loginId: string, amount: number, minGoods: number): Promise<void> {
  await 부름(page, 'POST', '/api/ops/coupons', { loginId, amount, minGoods });
}

export async function 문의답변하기(page: Page, inquiryId: number, answer: string): Promise<void> {
  await 부름(page, 'PUT', `/api/ops/inquiries/${inquiryId}/answer`, { answer });
}
