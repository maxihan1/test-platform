import type { APIRequestContext, Page, Route } from '@playwright/test';

import type { 주문완료화면 } from '../pages/checkout-done.page.js';
import type { 배송값, 주문서화면 } from '../pages/checkout.page.js';
import { 주문취소 } from './shop.helper.js';

export async function 조회실패모킹(page: Page, 주소패턴: RegExp): Promise<{ 걸린수: () => number; 풀기: () => Promise<void> }> {
  let 수 = 0;
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    수 += 1;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
  };
  await page.context().route(주소패턴, 처리);
  return {
    걸린수: () => 수,
    풀기: async () => {
      await page.context().unroute(주소패턴, 처리);
    },
  };
}

export async function 내주문모두취소(api: APIRequestContext): Promise<void> {
  const res = await api.get('/api/orders?period=all');
  if (res.status() === 401) return;
  if (!res.ok()) throw new Error(`내 주문 조회 실패: ${String(res.status())}`);
  for (const 줄 of ((await res.json()) as { items: { id: string }[] }).items) await 주문취소(api, 줄.id);
}

export async function 최종확인단계로(주문서: 주문서화면, 배송: 배송값, 결제수단: '신용카드' | '계좌이체' | '무통장입금' = '계좌이체'): Promise<void> {
  await 주문서.배송정보채우기(배송);
  await 주문서.다음누르기();
  await 주문서.결제수단고르기(결제수단);
  await 주문서.다음누르기();
}

export async function 결제하고완료기다리기(주문서: 주문서화면, 완료: 주문완료화면): Promise<{ 최종금액: string; 주문번호: string }> {
  const 최종금액 = (await 주문서.금액표())['최종 결제 금액'] ?? '';
  await 주문서.동의.check();
  await 주문서.결제하기.click();
  await 완료.제목.waitFor();
  await 완료.주문번호.filter({ hasText: /\S/ }).waitFor();
  return { 최종금액, 주문번호: (await 완료.주문번호.innerText()).trim() };
}
