import type { APIRequestContext } from '@playwright/test';

import { 토스트 } from '../components/toast.component.js';
import { 장바구니화면 } from '../pages/cart.page.js';
import { 주문하기화면 } from '../pages/checkout.page.js';
import { 상품상세화면 } from '../pages/product-detail.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import {
  장바구니비우기,
  장바구니에담기,
  장바구니읽기,
  장바구니되돌리기,
  새주문모두취소,
  서버로그인,
  주문목록읽기,
  type 담을줄,
  type 장바구니줄,
} from './api.helper.js';
import { 장바구니열기 } from './cart-order.helper.js';
import { 기기날짜, 밀어서찾기, 사라질때까지, 칩날짜, type 앱 } from './app.helper.js';

export const 기본결제수단 = '계좌이체';

export interface 정리거리 {
  앞주문번호들?: string[];
  앞장바구니줄들?: 장바구니줄[];
}

export interface 채울칸 {
  받는분?: string;
  연락처?: string;
  상세주소?: string;
  주소검색어?: string;
  날짜?: boolean;
  결제수단?: string;
  동의?: boolean;
}

export async function 서버준비하기(
  request: APIRequestContext,
  아이디: string,
  비밀번호: string,
  거리: 정리거리,
  장바구니줄들?: 담을줄[],
): Promise<void> {
  await 서버로그인(request, 아이디, 비밀번호);
  거리.앞주문번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
  if (장바구니줄들 === undefined) return;
  거리.앞장바구니줄들 = await 장바구니읽기(request);
  await 장바구니비우기(request);
  for (const 줄 of 장바구니줄들) await 장바구니에담기(request, 줄);
}

export async function 서버정리하기(request: APIRequestContext, 거리: 정리거리): Promise<void> {
  try {
    if (거리.앞주문번호들 !== undefined) await 새주문모두취소(request, 거리.앞주문번호들);
  } finally {
    if (거리.앞장바구니줄들 !== undefined) await 장바구니되돌리기(request, 거리.앞장바구니줄들);
  }
}

export async function 새주문번호들(request: APIRequestContext, 앞번호들: string[]): Promise<string[]> {
  return (await 주문목록읽기(request)).map((주문) => 주문.id).filter((번호) => !앞번호들.includes(번호));
}

export async function 바로구매로열기(driver: 앱, 상품명: string): Promise<boolean> {
  await new 상품목록화면(driver).상품열기(상품명);
  const 상세 = new 상품상세화면(driver);
  if (!(await 상세.열릴때까지())) return false;
  await 상세.옵션고르기();
  await 상세.바로구매누르기();
  return new 주문하기화면(driver).열릴때까지();
}

export async function 주문하기다시열기(driver: 앱, 상품명: string): Promise<boolean> {
  await driver.back();
  if (await new 상품상세화면(driver).열릴때까지(5000)) await driver.back();
  if (!(await new 상품목록화면(driver).열릴때까지())) return false;
  return 바로구매로열기(driver, 상품명);
}

export async function 줄만체크하기(driver: 앱, 이름들: string[], 고를이름: string): Promise<void> {
  const 장바구니 = new 장바구니화면(driver);
  for (const 이름 of 이름들) {
    if ((await 장바구니.줄체크켜졌나(이름)) !== (이름 === 고를이름)) await 장바구니.줄체크(이름).click();
  }
}

export { 장바구니열기 };

export async function 장바구니에서주문하기열기(driver: 앱): Promise<boolean> {
  await 밀어서찾기(driver, '~order_button');
  await new 장바구니화면(driver).주문하기.click();
  return new 주문하기화면(driver).열릴때까지();
}

export async function 칸채우기(driver: 앱, 칸: 채울칸): Promise<void> {
  const 화면 = new 주문하기화면(driver);
  if (칸.받는분 !== undefined) await 화면.칸적기('receiver', 칸.받는분);
  if (칸.연락처 !== undefined) await 화면.칸적기('phone', 칸.연락처);
  if (칸.상세주소 !== undefined) await 화면.칸적기('address_detail', 칸.상세주소);
  if (칸.주소검색어 !== undefined) await 화면.주소고르기(칸.주소검색어);
  if (칸.날짜 === true) await 화면.날짜고르기();
  if (칸.결제수단 !== undefined) await 화면.결제수단고르기(칸.결제수단);
  if (칸.동의 === true) await 화면.동의누르기();
}

export async function 결제눌러토스트읽기(driver: 앱): Promise<string> {
  await 사라질때까지(driver, '~toast');
  await new 주문하기화면(driver).결제누르기();
  return new 토스트(driver).글();
}

export async function 일요일칩글(driver: 앱): Promise<string> {
  const 둘째날 = await 기기날짜(driver, 2);
  const 일요일까지 = (7 - 둘째날.getUTCDay()) % 7;
  return 칩날짜(new Date(둘째날.getTime() + 일요일까지 * 24 * 60 * 60 * 1000));
}

export function 금액부분(글: string): string {
  return 글.match(/-?[\d,]+원/)?.[0] ?? '';
}
