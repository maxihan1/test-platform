import type { APIRequestContext } from '@playwright/test';

import { 머리줄 } from '../components/top-bar.component.js';
import { 장바구니화면 } from '../pages/cart.page.js';
import { 주문내역화면 } from '../pages/order-list.page.js';
import { 주문상세화면 } from '../pages/order-detail.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import { 상품읽기, 주문만들기, 주문목록읽기, 주문읽기, type 담을줄, type 장바구니줄 } from './api.helper.js';
import type { 앱 } from './app.helper.js';

export function 줄찾기(줄들: 장바구니줄[], 상품번호: number): 장바구니줄 {
  const 줄 = 줄들.find((후보) => 후보.productId === 상품번호);
  if (줄 === undefined) throw new Error(`서버 장바구니에 상품 ${상품번호} 줄이 없다`);
  return 줄;
}

export function 한국날짜(밀리초: number): string {
  return new Date(밀리초 + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function 배송비(상품금액: number, 체크한줄수: number): number {
  if (체크한줄수 === 0 || 상품금액 >= 50000) return 0;
  return 3000;
}

export function 모자란금액(상품금액: number): number {
  return 50000 - 상품금액;
}

export async function 첫옵션줄(request: APIRequestContext, 상품번호: number, 수량 = 1): Promise<담을줄> {
  const 상품 = await 상품읽기(request, 상품번호);
  return { productId: 상품번호, color: 상품.colors?.[0] ?? '', size: 상품.sizes?.[0] ?? '', qty: 수량 };
}

export async function 장바구니열기(driver: 앱): Promise<boolean> {
  await new 상품목록화면(driver).장바구니버튼.click();
  return new 장바구니화면(driver).열릴때까지();
}

export async function 상품목록으로돌아가기(driver: 앱): Promise<boolean> {
  const 목록 = new 상품목록화면(driver);
  if (await 목록.보이는가()) return true;
  for (let i = 0; i < 3; i += 1) {
    await new 머리줄(driver).뒤로누르기();
    if (await 목록.열릴때까지(4000)) return true;
  }
  return false;
}

export async function 장바구니다시열기(driver: 앱): Promise<boolean> {
  if (!(await 상품목록으로돌아가기(driver))) return false;
  return 장바구니열기(driver);
}

export async function 주문내역열기(driver: 앱): Promise<boolean> {
  await new 상품목록화면(driver).주문내역버튼.click();
  return new 주문내역화면(driver).열릴때까지();
}

export async function 주문내역에서상세열기(driver: 앱, 주문번호: string): Promise<boolean> {
  await new 주문내역화면(driver).주문열기(주문번호);
  return new 주문상세화면(driver).열릴때까지();
}

export async function 주문상세열기(driver: 앱, 주문번호: string): Promise<boolean> {
  if (!(await 주문내역열기(driver))) return false;
  return 주문내역에서상세열기(driver, 주문번호);
}

export async function 주문내역으로돌아오기(driver: 앱): Promise<boolean> {
  await new 머리줄(driver).뒤로누르기();
  return new 주문내역화면(driver).열릴때까지();
}

export async function 주문만들어두기(request: APIRequestContext, 상품번호: number, 최소건수: number): Promise<string[]> {
  const 지금건수 = (await 주문목록읽기(request)).length;
  const 새번호들: string[] = [];
  for (let i = 0; i < Math.max(1, 최소건수 - 지금건수); i += 1) {
    새번호들.push(await 주문만들기(request, { productId: 상품번호 }));
  }
  return 새번호들;
}

export async function 여러상품주문번호(request: APIRequestContext): Promise<string | undefined> {
  for (const 주문 of await 주문목록읽기(request)) {
    if ((await 주문읽기(request, 주문.id)).lines.length > 1) return 주문.id;
  }
  return undefined;
}
