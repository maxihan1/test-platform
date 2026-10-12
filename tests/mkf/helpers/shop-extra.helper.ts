import type { APIRequestContext, Page, Route } from '@playwright/test';

import { 탈퇴 } from './account.helper.js';
import { 내주문모두취소 } from './checkout-flow.helper.js';
import { 주문요청본문 } from './order-tools.helper.js';
import { 상품상세조회 } from './shop-tools.helper.js';
import type { 상품상세 } from './shop-tools.helper.js';
import { 상품목록, 장바구니담기, 장바구니비우기 } from './shop.helper.js';
import type { 상품 } from './shop.helper.js';

export async function 임시회원치우기(api: APIRequestContext, 주문도취소 = false): Promise<void> {
  try {
    if (주문도취소) await 내주문모두취소(api);
    await 장바구니비우기(api);
  } finally {
    await 탈퇴(api);
  }
}

export async function 하나만맞는최대가격(api: APIRequestContext): Promise<number> {
  const 가격들 = (await 상품목록(api)).items.map((상품줄) => 상품줄.salePrice);
  for (let 값 = 500000; 값 >= 0; 값 -= 10000) {
    if (가격들.filter((가격) => 가격 <= 값).length === 1) return 값;
  }
  throw new Error('맞는 상품이 하나뿐인 슬라이더 값이 없다');
}

export async function 금액을맞춰담기(api: APIRequestContext, 목표금액: number): Promise<{ 줄번호: number; 상품: 상품; 수량: number }> {
  const { items } = await 상품목록(api);
  for (const 후보 of items) {
    if (후보.soldOut || 후보.salePrice <= 0 || 목표금액 % 후보.salePrice !== 0) continue;
    const 수량 = 목표금액 / 후보.salePrice;
    if (수량 < 1 || 수량 > 10 || 후보.stock < 수량 + 6) continue;
    const 상세 = await 상품상세조회(api, 후보.id);
    if (상세.colors !== undefined && 상세.colors.length > 0) continue;
    const 줄번호 = await 장바구니담기(api, { productId: 후보.id, qty: 수량 });
    return { 줄번호, 상품: 후보, 수량 };
  }
  throw new Error(`상품 금액 ${String(목표금액)}원을 맞출 상품이 없다`);
}

export async function 리뷰있는상품(api: APIRequestContext): Promise<상품상세> {
  const 찾은것 = (await 상품목록(api)).items.find((상품줄) => !상품줄.soldOut && 상품줄.stock > 10 && 상품줄.reviewCount > 0);
  if (찾은것 === undefined) throw new Error('리뷰가 있고 재고가 넉넉한 상품이 없다');
  return 상품상세조회(api, 찾은것.id);
}

export async function 재고부족응답(api: APIRequestContext, 대상: 상품): Promise<{ status: number; body: unknown }> {
  const res = await api.post('/api/orders', {
    data: 주문요청본문({ direct: { productId: 대상.id, qty: 9999, color: 대상.colors?.[0] ?? '', size: 대상.sizes?.[0] ?? '' } }),
  });
  if (res.status() !== 409) throw new Error(`재고 초과 주문이 409 로 돌아오지 않았다: ${String(res.status())} ${await res.text()}`);
  return { status: res.status(), body: await res.json() };
}

export async function 주문응답모킹(page: Page, 응답: { status: number; body: unknown }): Promise<{ 걸린수: () => number; 풀기: () => Promise<void> }> {
  let 수 = 0;
  const 주소 = /\/api\/orders$/;
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    수 += 1;
    await route.fulfill({ status: 응답.status, contentType: 'application/json', body: JSON.stringify(응답.body) });
  };
  await page.context().route(주소, 처리);
  return {
    걸린수: () => 수,
    풀기: async () => {
      await page.context().unroute(주소, 처리);
    },
  };
}
