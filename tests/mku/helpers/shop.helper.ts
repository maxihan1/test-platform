import type { APIRequestContext } from '@playwright/test';

export interface 상품 {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate: number;
  salePrice: number;
  reviewCount: number;
  stock: number;
  soldOut: boolean;
  colors?: string[];
  sizes?: string[];
}

export interface 장바구니줄 {
  id: number;
  productId: number;
  name: string;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
}

export async function 상품목록(api: APIRequestContext, 조건 = 'size=100'): Promise<{ items: 상품[]; total: number }> {
  const res = await api.get(`/api/products?${조건}`);
  if (!res.ok()) throw new Error(`상품 목록 조회 실패: ${String(res.status())}`);
  return (await res.json()) as { items: 상품[]; total: number };
}

export async function 상품정보(api: APIRequestContext, id: number): Promise<상품> {
  const res = await api.get(`/api/products/${String(id)}`);
  if (!res.ok()) throw new Error(`상품 조회 실패: ${String(res.status())}`);
  return (await res.json()) as 상품;
}

export async function 장바구니보기(api: APIRequestContext): Promise<장바구니줄[]> {
  const res = await api.get('/api/cart');
  if (!res.ok()) throw new Error(`장바구니 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: 장바구니줄[] }).items;
}

export async function 장바구니담기(api: APIRequestContext, 줄: { productId: number; qty: number; color?: string; size?: string }): Promise<number> {
  const res = await api.post('/api/cart', { data: 줄 });
  if (res.status() !== 201 && res.status() !== 200) throw new Error(`장바구니 담기 실패: ${String(res.status())} ${await res.text()}`);
  return ((await res.json()) as { id: number }).id;
}

export async function 장바구니비우기(api: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니보기(api)) {
    const res = await api.delete(`/api/cart/${String(줄.id)}`);
    if (res.status() !== 204 && res.status() !== 404) throw new Error(`장바구니 줄 지우기 실패: ${String(res.status())}`);
  }
}

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

export function 다가오는일요일(): string {
  for (let 일수 = 2; 일수 <= 14; 일수 += 1) {
    const 날 = 며칠뒤(일수);
    if (날.getDay() === 0) return 날짜글(날);
  }
  throw new Error('2~14일 뒤에 일요일이 없다');
}

export async function 주문하기(api: APIRequestContext, 장바구니줄번호: number[], 받는분 = '임시회원'): Promise<{ id: string; total: number }> {
  const res = await api.post('/api/orders', {
    data: {
      shipping: { receiver: 받는분, phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '5층', request: '', deliveryDate: 일요일아닌배송일() },
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: '',
      cartItemIds: 장바구니줄번호,
    },
  });
  if (res.status() !== 201) throw new Error(`주문 실패: ${String(res.status())} ${await res.text()}`);
  return (await res.json()) as { id: string; total: number };
}

export async function 주문취소(api: APIRequestContext, 주문번호: string): Promise<void> {
  const res = await api.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
  if (!res.ok() && res.status() !== 409) throw new Error(`주문 취소 실패: ${String(res.status())}`);
}
