import { 머리줄 } from '../components/top-bar.component.js';
import type { 상품목록화면 } from '../pages/product-list.page.js';
import type { 장바구니줄 } from './api.helper.js';
import { 기다림, 사라질때까지, 한번밀기, type 앱 } from './app.helper.js';

export async function 제목이될때까지(driver: 앱, 글: string, 시간 = 기다림): Promise<boolean> {
  return driver
    .waitUntil(async () => (await new 머리줄(driver).제목.getText().catch(() => '')) === 글, { timeout: 시간 })
    .then(() => true, () => false);
}

export async function 내리며모으기(driver: 앱, 목록: 상품목록화면, 목표수: number): Promise<string[]> {
  const 모음: string[] = [];
  let 그대로 = 0;
  for (let i = 0; i < 40 && 모음.length < 목표수 && 그대로 < 3; i += 1) {
    const 앞 = 모음.length;
    for (const 이름 of await 목록.보이는상품명()) if (!모음.includes(이름)) 모음.push(이름);
    그대로 = 모음.length === 앞 ? 그대로 + 1 : 0;
    if (모음.length < 목표수) {
      await 한번밀기(driver);
      await 사라질때까지(driver, '~loading');
    }
  }
  return 모음;
}

export function 수량합(줄들: 장바구니줄[]): number {
  return 줄들.reduce((합, 줄) => 합 + 줄.qty, 0);
}

export function 줄이름들(줄들: 장바구니줄[]): string {
  return 줄들.map((줄) => `${줄.productId}/${줄.color}/${줄.size}`).join(', ');
}

export function 줄수량들(줄들: 장바구니줄[]): string {
  return 줄들.map((줄) => String(줄.qty)).join(', ');
}
