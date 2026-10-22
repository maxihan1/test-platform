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

export interface 담을줄 {
  productId: number;
  color?: string;
  size?: string;
  qty?: number;
}

export interface 상품정보 {
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
  description?: string;
  colors?: string[];
  sizes?: string[];
}

export interface 주문요약 {
  id: string;
  createdAt: number;
  status: string;
  total: number;
  title: string;
}

export interface 주문정보 {
  id: string;
  status: string;
  createdAt: number;
  lines: { productId: number; name: string; color: string; size: string; qty: number; unitPrice: number }[];
  shipping: { receiver: string; phone: string; zipcode: string; address: string; detail: string; request: string; deliveryDate: string };
  payment: { method: string; cardCompany: string; installment: string };
  couponId: string;
  goods: number;
  discount: number;
  shippingFee: number;
  total: number;
  cancel: { reason: string; detail: string } | null;
}

export interface 쿠폰 {
  id: string;
  label: string;
  minGoods: number;
}

async function 읽기<T>(응답: Awaited<ReturnType<APIRequestContext['get']>>, 무엇: string): Promise<T> {
  if (!응답.ok()) throw new Error(`${무엇} 요청이 ${응답.status()} 로 실패했다: ${await 응답.text()}`);
  return (await 응답.json()) as T;
}

export async function 서버로그인(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<void> {
  const 응답 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  if (!응답.ok()) throw new Error(`서버 로그인이 ${응답.status()} 로 실패했다`);
}

export async function 장바구니읽기(request: APIRequestContext): Promise<장바구니줄[]> {
  return (await 읽기<{ items: 장바구니줄[] }>(await request.get('/api/cart'), '장바구니')).items;
}

export async function 장바구니에담기(request: APIRequestContext, 줄: 담을줄): Promise<void> {
  const 응답 = await request.post('/api/cart', {
    data: { productId: 줄.productId, color: 줄.color ?? '', size: 줄.size ?? '', qty: 줄.qty ?? 1 },
  });
  if (!응답.ok()) throw new Error(`장바구니 담기가 ${응답.status()} 로 실패했다: ${await 응답.text()}`);
}

export async function 장바구니비우기(request: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니읽기(request)) {
    const 응답 = await request.delete(`/api/cart/${줄.id}`);
    if (!응답.ok()) throw new Error(`장바구니 줄 ${줄.id} 지우기가 ${응답.status()} 로 실패했다`);
  }
}

export async function 장바구니바꾸기(request: APIRequestContext, 줄들: 담을줄[]): Promise<장바구니줄[]> {
  const 앞줄들 = await 장바구니읽기(request);
  await 장바구니비우기(request);
  for (const 줄 of 줄들) await 장바구니에담기(request, 줄);
  return 앞줄들;
}

export async function 장바구니되돌리기(request: APIRequestContext, 앞줄들: 장바구니줄[]): Promise<void> {
  await 장바구니비우기(request);
  for (const 줄 of 앞줄들) await 장바구니에담기(request, { productId: 줄.productId, color: 줄.color, size: 줄.size, qty: 줄.qty });
}

export async function 상품읽기(request: APIRequestContext, 번호: number): Promise<상품정보> {
  return 읽기<상품정보>(await request.get(`/api/products/${번호}`), `상품 ${번호}`);
}

export async function 상품목록읽기(
  request: APIRequestContext,
  조건: { category?: string; page?: number; size?: number } = {},
): Promise<{ items: 상품정보[]; total: number }> {
  const 묻기 = new URLSearchParams();
  if (조건.category) 묻기.set('category', 조건.category);
  묻기.set('page', String(조건.page ?? 1));
  묻기.set('size', String(조건.size ?? 10));
  return 읽기<{ items: 상품정보[]; total: number }>(await request.get(`/api/products?${묻기.toString()}`), '상품 목록');
}

export async function 쿠폰읽기(request: APIRequestContext): Promise<쿠폰[]> {
  return (await 읽기<{ items: 쿠폰[] }>(await request.get('/api/coupons'), '쿠폰')).items;
}

export async function 주문목록읽기(request: APIRequestContext): Promise<주문요약[]> {
  return (await 읽기<{ items: 주문요약[] }>(await request.get('/api/orders?period=all'), '주문 목록')).items;
}

export async function 주문읽기(request: APIRequestContext, 주문번호: string): Promise<주문정보> {
  return 읽기<주문정보>(await request.get(`/api/orders/${encodeURIComponent(주문번호)}`), `주문 ${주문번호}`);
}

function 배송가능일(): string {
  const 날 = new Date(Date.now() + 9 * 3600 * 1000);
  날.setUTCDate(날.getUTCDate() + 3);
  if (날.getUTCDay() === 0) 날.setUTCDate(날.getUTCDate() + 1);
  return 날.toISOString().slice(0, 10);
}

export async function 주문만들기(request: APIRequestContext, 줄: 담을줄): Promise<string> {
  const 응답 = await request.post('/api/orders', {
    data: {
      shipping: {
        receiver: '김데모',
        phone: '01012345678',
        zipcode: '06236',
        address: '서울 강남구 테헤란로 123',
        detail: '4층',
        request: '',
        deliveryDate: 배송가능일(),
      },
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: '',
      direct: { productId: 줄.productId, color: 줄.color ?? '', size: 줄.size ?? '', qty: 줄.qty ?? 1 },
    },
  });
  return (await 읽기<{ id: string }>(응답, '주문 만들기')).id;
}

export async function 주문취소하기(request: APIRequestContext, 주문번호: string, 사유 = '단순 변심'): Promise<void> {
  const 응답 = await request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: 사유, detail: '' } });
  if (!응답.ok()) throw new Error(`주문 ${주문번호} 취소가 ${응답.status()} 로 실패했다: ${await 응답.text()}`);
}

export async function 새주문모두취소(request: APIRequestContext, 앞주문번호들: string[]): Promise<void> {
  for (const 주문 of await 주문목록읽기(request)) {
    if (!앞주문번호들.includes(주문.id) && 주문.status === '결제완료') await 주문취소하기(request, 주문.id);
  }
}

export async function 상태별주문번호(request: APIRequestContext, 상태: string): Promise<string | undefined> {
  return (await 주문목록읽기(request)).find((주문) => 주문.status === 상태)?.id;
}
