import type { APIRequestContext } from '@playwright/test';

import type { 토스트 } from '../components/toast.component.js';
import { 머리줄 } from '../components/top-bar.component.js';
import type { 주문상세화면 } from '../pages/order-detail.page.js';
import { 새주문번호들 } from './checkout-flow.helper.js';
import { 기다림, 밀어서찾기, 앱꾸러미, type 앱 } from './app.helper.js';

export type 요소 = ReturnType<앱['$']>;

export const 닿지않는주소 = 'http://127.0.0.1:9';

export const 토스트여유 = 2000;

export async function 기기뒤로가기(driver: 앱): Promise<void> {
  await driver.execute('mobile: pressKey', { keycode: 4 });
}

export async function 앱데이터지우기(driver: 앱): Promise<void> {
  await driver.execute('mobile: clearApp', { appId: 앱꾸러미 });
}

export async function 다른화면제목글(driver: 앱): Promise<string> {
  const 머리 = new 머리줄(driver);
  await 머리.뒤로.waitForDisplayed({ timeout: 기다림 });
  return 머리.제목글();
}

export async function 뒤로버튼글(driver: 앱): Promise<string> {
  return driver.$('//android.view.View[@resource-id="back_button"]//android.widget.TextView').getText();
}

export async function 화면아래에있나(driver: 앱, 대상: 요소): Promise<boolean> {
  const 자리 = await 대상.getLocation();
  const 크기 = await 대상.getSize();
  const 창 = await driver.getWindowSize();
  return 자리.y + 크기.height / 2 > 창.height / 2;
}

export async function 아래에있나(기준: 요소, 대상: 요소): Promise<boolean> {
  const 기준자리 = await 기준.getLocation();
  const 기준크기 = await 기준.getSize();
  const 대상자리 = await 대상.getLocation();
  const 대상크기 = await 대상.getSize();
  return 대상자리.y + 대상크기.height / 2 > 기준자리.y + 기준크기.height / 2;
}

export async function 왼쪽에있나(왼쪽: 요소, 오른쪽: 요소): Promise<boolean> {
  return (await 왼쪽.getLocation()).x < (await 오른쪽.getLocation()).x;
}

export async function 토스트사라질때까지(알림: 토스트, 초: number): Promise<boolean> {
  return 알림.틀.waitForDisplayed({ timeout: 초 * 1000 + 토스트여유, reverse: true }).then(() => true, () => false);
}

export async function 카드판매가글(driver: 앱, 카드선택자: string): Promise<string> {
  return driver.$(`${카드선택자}//android.widget.TextView[@resource-id="product_price"]`).getText();
}

export async function 주문결제금액글(driver: 앱, 상세: 주문상세화면): Promise<string> {
  await 밀어서찾기(driver, '~order_total');
  return 상세.결제금액.getText();
}

export async function 새주문번호(request: APIRequestContext, 앞번호들: string[]): Promise<string> {
  const [새주문] = await 새주문번호들(request, 앞번호들);
  if (새주문 === undefined) throw new Error('방금 만든 주문을 서버 주문 목록에서 찾지 못했다');
  return 새주문;
}
