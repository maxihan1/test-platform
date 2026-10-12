import type { APIRequestContext } from '@playwright/test';

export function 날짜글(날: Date): string {
  return `${String(날.getFullYear())}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
}

export function 며칠뒤(일수: number): Date {
  const 날 = new Date();
  날.setHours(12, 0, 0, 0);
  날.setDate(날.getDate() + 일수);
  return 날;
}

export function 일요일아닌배송일(): string {
  const 날 = 며칠뒤(3);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글(날);
}

export async function 상품할인가(api: APIRequestContext, 번호: number): Promise<number> {
  const res = await api.get(`/api/products/${String(번호)}`);
  if (!res.ok()) throw new Error(`상품 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { salePrice: number }).salePrice;
}

export function 범위안일요일(): string {
  const 날 = 며칠뒤(2);
  while (날.getDay() !== 0) 날.setDate(날.getDate() + 1);
  return 날짜글(날);
}

export async function 전체주문들(api: APIRequestContext): Promise<{ id: string; createdAt: number; status: string }[]> {
  const res = await api.get('/api/orders?period=all');
  if (!res.ok()) throw new Error(`주문 내역 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { id: string; createdAt: number; status: string }[] }).items;
}

export async function 상태별주문번호(api: APIRequestContext, 상태: string): Promise<string> {
  const 찾은 = (await 전체주문들(api)).find((주문) => 주문.status === 상태);
  if (찾은 === undefined) throw new Error(`「${상태}」 주문이 없다`);
  return 찾은.id;
}

export async function 석달넘은주문번호(api: APIRequestContext): Promise<string> {
  const 석달전 = new Date();
  석달전.setMonth(석달전.getMonth() - 3);
  const 찾은 = (await 전체주문들(api)).find((주문) => 주문.createdAt < 석달전.getTime());
  if (찾은 === undefined) throw new Error('3개월보다 오래된 주문이 없다');
  return 찾은.id;
}
