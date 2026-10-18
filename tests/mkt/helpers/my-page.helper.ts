import type { APIRequestContext, APIResponse, Locator, Page } from '@playwright/test';
import { 로그인요청, 회원정리, type 회원정보 } from './account.helper.js';
import { 배송가능일, 주문취소요청 } from './data.helper.js';

export async function 상태별주문번호(요청: APIRequestContext, 상태: string): Promise<string> {
  const 응답 = await 요청.get('/api/orders?period=all');
  if (응답.status() !== 200) throw new Error(`주문 목록 조회가 실패했다: ${응답.status()}`);
  const 목록 = ((await 응답.json()) as { items: { id: string; status: string }[] }).items;
  const 찾음 = 목록.find((주문) => 주문.status === 상태);
  if (!찾음) throw new Error(`상태가 「${상태}」인 주문이 없다`);
  return 찾음.id;
}

export async function 재고견주기용상품번호(요청: APIRequestContext): Promise<number> {
  const 옵션있는상품 = new Set([1, 5, 9, 13, 17, 21, 25, 29, 33, 37]);
  const 제외 = new Set([2, 12]);
  const 응답 = await 요청.get('/api/products?size=100');
  if (응답.status() !== 200) throw new Error(`상품 목록 조회가 실패했다: ${응답.status()}`);
  const 후보 = ((await 응답.json()) as { items: { id: number; stock: number; soldOut: boolean }[] }).items.filter(
    (상품) => !상품.soldOut && 상품.stock >= 20 && !옵션있는상품.has(상품.id) && !제외.has(상품.id),
  );
  if (후보.length === 0) throw new Error('재고를 견줄 만한 상품이 없다');
  return 후보[Math.floor(Math.random() * 후보.length)]!.id;
}

export async function 회원과주문정리(요청: APIRequestContext, 회원: 회원정보 | undefined, 주문번호들: string[] = []): Promise<void> {
  if (!회원) return;
  await 로그인요청(요청, 회원.loginId, 회원.password);
  for (const 주문번호 of 주문번호들) await 주문취소요청(요청, 주문번호);
  await 회원정리(요청, 회원);
}

export async function 리뷰목록받기(요청: APIRequestContext, 상품번호: number, 시도: number): Promise<{ status: number; items: { content?: string }[] }> {
  let 상태 = 0;
  for (let i = 0; i < 시도; i++) {
    const 응답 = await 요청.get(`/api/products/${상품번호}/reviews`);
    상태 = 응답.status();
    if (상태 === 200) return { status: 상태, items: ((await 응답.json()) as { items: { content?: string }[] }).items };
  }
  return { status: 상태, items: [] };
}

export async function 자동완성검색어찾기(요청: APIRequestContext, 최소개수: number): Promise<string> {
  const 응답 = await 요청.get('/api/products?size=100');
  if (응답.status() !== 200) throw new Error(`상품 목록 조회가 실패했다: ${응답.status()}`);
  const 이름들 = ((await 응답.json()) as { items: { name: string }[] }).items.map((상품) => 상품.name);
  const 센다 = new Map<string, number>();
  for (const 이름 of 이름들) {
    const 본 = new Set<string>();
    for (let 길이 = 1; 길이 <= 2; 길이++) {
      for (let i = 0; i + 길이 <= 이름.length; i++) {
        const 조각 = 이름.slice(i, i + 길이);
        if (조각.trim() === 조각) 본.add(조각);
      }
    }
    for (const 조각 of 본) 센다.set(조각, (센다.get(조각) ?? 0) + 1);
  }
  const 후보 = [...센다.entries()].filter(([, 개수]) => 개수 >= 최소개수).sort((a, b) => a[1] - b[1]);
  if (후보.length === 0) throw new Error(`이름에 든 상품이 ${최소개수}개 이상인 검색어가 없다`);
  return 후보[0]![0];
}

export function 상품상세_리뷰탭(page: Page): Locator {
  return page.getByRole('tab', { name: /^리뷰/ });
}

export function 상품상세_다시시도버튼(page: Page): Locator {
  return page.getByRole('button', { name: '다시 시도', exact: true });
}

export function 상품상세_담기버튼(page: Page): Locator {
  return page.locator('.add-cart');
}

export function 상품상세_로딩표시(page: Page): Locator {
  return 상품상세_담기버튼(page).getByLabel('처리 중');
}

export function 상품상세_제목(page: Page, 상품이름: string): Locator {
  return page.getByRole('heading', { name: 상품이름, level: 1 });
}

export async function 주문요청(
  요청: APIRequestContext,
  입력: { cartItemIds?: number[]; direct?: { productId: number; qty: number; color: string; size: string } },
): Promise<APIResponse> {
  return 요청.post('/api/orders', {
    data: {
      shipping: { receiver: '홍길동', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101호', request: '', deliveryDate: 배송가능일() },
      payment: { method: '무통장입금', cardCompany: '', installment: '' },
      couponId: '',
      ...(입력.direct === undefined ? { cartItemIds: 입력.cartItemIds ?? [] } : { direct: 입력.direct }),
    },
  });
}
