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

export interface 주문결과 {
  id: string;
  total: number;
}

export function 고유글자(머리: string): string {
  return `${머리} ${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function 날짜글자(날: Date): string {
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export function 며칠뒤(일수: number, 기준: Date = new Date()): Date {
  const 날 = new Date(기준.getFullYear(), 기준.getMonth(), 기준.getDate());
  날.setDate(날.getDate() + 일수);
  return 날;
}

export function 배송가능일(최소일수 = 3): string {
  let 일수 = 최소일수;
  while (며칠뒤(일수).getDay() === 0) 일수 += 1;
  return 날짜글자(며칠뒤(일수));
}

export async function 글만들기(요청: APIRequestContext, 글: { category?: string; title: string; content: string }): Promise<number> {
  const 응답 = await 요청.post('/api/posts', { data: { category: 글.category ?? '자유', title: 글.title, content: 글.content } });
  if (응답.status() !== 201) throw new Error(`글 만들기가 실패했다: ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { id: number }).id;
}

export async function 글지우기(요청: APIRequestContext, 글번호: number): Promise<number> {
  const 응답 = await 요청.delete(`/api/posts/${글번호}`);
  return 응답.status();
}

export async function 댓글달기(요청: APIRequestContext, 글번호: number, 내용: string, 부모번호?: number): Promise<number> {
  const 응답 = await 요청.post(`/api/posts/${글번호}/comments`, { data: { content: 내용, ...(부모번호 === undefined ? {} : { parentId: 부모번호 }) } });
  if (응답.status() !== 201) throw new Error(`댓글 달기가 실패했다: ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { id: number }).id;
}

export async function 장바구니담기(요청: APIRequestContext, 상품번호: number, 수량 = 1, 색상 = '', 사이즈 = ''): Promise<number> {
  const 응답 = await 요청.post('/api/cart', { data: { productId: 상품번호, qty: 수량, color: 색상, size: 사이즈 } });
  if (응답.status() !== 201) throw new Error(`장바구니 담기가 실패했다: ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { id: number }).id;
}

export async function 장바구니목록(요청: APIRequestContext): Promise<장바구니줄[]> {
  const 응답 = await 요청.get('/api/cart');
  if (응답.status() !== 200) throw new Error(`장바구니 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { items: 장바구니줄[] }).items;
}

export async function 장바구니비우기(요청: APIRequestContext): Promise<void> {
  for (const 줄 of await 장바구니목록(요청)) await 요청.delete(`/api/cart/${줄.id}`);
}

export async function 상품정보(요청: APIRequestContext, 상품번호: number): Promise<{ id: number; name: string; salePrice: number; stock: number; soldOut: boolean; colors: string[]; sizes: string[] }> {
  const 응답 = await 요청.get(`/api/products/${상품번호}`);
  if (응답.status() !== 200) throw new Error(`상품 조회가 실패했다: ${응답.status()}`);
  return (await 응답.json()) as { id: number; name: string; salePrice: number; stock: number; soldOut: boolean; colors: string[]; sizes: string[] };
}

export async function 주문하기(요청: APIRequestContext, 장바구니줄번호들: number[], 쿠폰 = ''): Promise<주문결과> {
  const 응답 = await 요청.post('/api/orders', {
    data: {
      shipping: { receiver: '홍길동', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101호', request: '', deliveryDate: 배송가능일() },
      payment: { method: '무통장입금', cardCompany: '', installment: '' },
      couponId: 쿠폰,
      cartItemIds: 장바구니줄번호들,
    },
  });
  if (응답.status() !== 201) throw new Error(`주문이 실패했다: ${응답.status()} ${await 응답.text()}`);
  return (await 응답.json()) as 주문결과;
}

export async function 상품하나주문하기(요청: APIRequestContext, 상품번호: number, 수량 = 1): Promise<주문결과> {
  const 줄번호 = await 장바구니담기(요청, 상품번호, 수량);
  return 주문하기(요청, [줄번호]);
}

export async function 주문취소요청(요청: APIRequestContext, 주문번호: string, 사유 = '단순 변심', 자세히 = ''): Promise<number> {
  const 응답 = await 요청.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: 사유, detail: 자세히 } });
  return 응답.status();
}

export async function 주문상태(요청: APIRequestContext, 주문번호: string): Promise<string> {
  const 응답 = await 요청.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  if (응답.status() !== 200) throw new Error(`주문 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { status: string }).status;
}

export async function 읽지않은알림수(요청: APIRequestContext): Promise<number> {
  const 응답 = await 요청.get('/api/notifications');
  if (응답.status() !== 200) throw new Error(`알림 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { unread: number }).unread;
}
