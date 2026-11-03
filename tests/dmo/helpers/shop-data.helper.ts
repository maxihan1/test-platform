import type { Page } from '@playwright/test';

async function 부름<T>(page: Page, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown): Promise<T> {
  const res = await page.request.fetch(url, { method, ...(data === undefined ? {} : { data }) });
  if (!res.ok()) throw new Error(`${method} ${url} 실패 ${res.status()} ${await res.text()}`);
  return (res.status() === 204 ? null : await res.json()) as T;
}

export async function 글쓰기(page: Page, title: string, content: string, category = '자유'): Promise<{ id: number }> {
  return 부름(page, 'POST', '/api/posts', { category, title, content, images: [] });
}

export async function 글지우기(page: Page, postId: number): Promise<void> {
  await 부름(page, 'DELETE', `/api/posts/${postId}`);
}

export async function 댓글쓰기(page: Page, postId: number, content: string): Promise<{ id: number }> {
  return 부름(page, 'POST', `/api/posts/${postId}/comments`, { content, parentId: null });
}

export async function 문의남기기(page: Page, title: string, content: string, type = '기타'): Promise<{ id: number }> {
  return 부름(page, 'POST', '/api/inquiries', { type, title, content, fileName: '', fileData: '', emailNotify: false });
}

export async function 장바구니담기(page: Page, productId: number, qty = 1): Promise<void> {
  const p = await 부름<{ colors?: string[]; sizes?: string[] }>(page, 'GET', `/api/products/${productId}`);
  await 부름(page, 'POST', '/api/cart', { productId, color: p.colors?.[0] ?? null, size: p.sizes?.[0] ?? null, qty });
}

export async function 장바구니(page: Page): Promise<{ id: number; productId: number; qty: number }[]> {
  return (await 부름<{ items: { id: number; productId: number; qty: number }[] }>(page, 'GET', '/api/cart')).items;
}

export async function 장바구니비우기(page: Page): Promise<void> {
  for (const it of await 장바구니(page)) await 부름(page, 'DELETE', `/api/cart/${it.id}`);
}

export async function 쿠폰목록(page: Page): Promise<{ id: number | string; label: string; minGoods: number }[]> {
  return (await 부름<{ items: { id: number | string; label: string; minGoods: number }[] }>(page, 'GET', '/api/coupons')).items;
}
