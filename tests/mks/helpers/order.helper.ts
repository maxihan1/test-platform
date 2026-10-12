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
