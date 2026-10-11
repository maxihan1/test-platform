import type { APIRequestContext } from '@playwright/test';

export function 배송가능일(뒤 = 3, 기준 = new Date()): string {
  const d = new Date(기준.getTime());
  d.setDate(d.getDate() + 뒤);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}`;
}

export const 시험배송정보 = {
  receiver: '홍길동',
  phone: '01012345678',
  zipcode: '06236',
  address: '서울 강남구 테헤란로 123',
  detail: '4층',
  request: '',
};

export async function 바로주문(
  req: APIRequestContext,
  상품: { productId: number; qty: number; color?: string; size?: string },
): Promise<{ status: number; id?: string; total?: number; body: unknown }> {
  const res = await req.post('/api/orders', {
    data: {
      shipping: { ...시험배송정보, deliveryDate: 배송가능일() },
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: null,
      direct: { productId: 상품.productId, color: 상품.color ?? '', size: 상품.size ?? '', qty: 상품.qty },
    },
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; total?: number };
  return { status: res.status(), id: body.id, total: body.total, body };
}

export async function 주문취소(req: APIRequestContext, id: string): Promise<number> {
  const res = await req.post(`/api/orders/${encodeURIComponent(id)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
  return res.status();
}

export async function 재고읽기(req: APIRequestContext, productId: number): Promise<number> {
  const res = await req.get(`/api/products/${productId}`);
  if (!res.ok()) throw new Error(`상품 읽기 실패: ${res.status()}`);
  const body = (await res.json()) as { stock: number };
  return body.stock;
}
