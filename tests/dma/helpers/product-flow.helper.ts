import { 맨위줄 } from '../components/top-bar.component.js';
import { 장바구니화면 } from '../pages/cart.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import type { 앱, 요소 } from './app.helper.js';
import { 목록으로돌아가기, 장바구니열기, 장바구니줄지우기 } from './cart.helper.js';

export async function 첫카드(driver: 앱): Promise<요소> {
  const 카드 = (await new 상품목록화면(driver).카드들())[0];
  if (카드 === undefined) throw new Error('상품 목록에 상품 카드가 없다');
  return 카드;
}

export async function 총개수가바뀔때까지(driver: 앱, 앞글: string, timeout = 15000): Promise<void> {
  const 목록 = new 상품목록화면(driver);
  await driver.waitUntil(async () => (await 목록.총개수글()) !== 앞글, {
    timeout,
    interval: 300,
    timeoutMsg: `「${앞글}」이 다른 글로 바뀌지 않았다`,
  });
}

export async function 담은줄정리(driver: 앱, 상품이름: string): Promise<void> {
  await 목록으로돌아가기(driver);
  await 장바구니줄지우기(driver, 상품이름);
}

export async function 장바구니숫자읽기(driver: 앱): Promise<number> {
  const 장바구니: 장바구니화면 = await 장바구니열기(driver);
  const 줄수 = await 장바구니.줄수();
  await 목록으로돌아가기(driver);
  const 목록 = new 상품목록화면(driver);
  await 목록.장바구니수가될때까지(줄수).catch(() => undefined);
  return 목록.장바구니수();
}

export async function 맨위줄제목보다오른쪽인가(driver: 앱, 칸: 요소): Promise<boolean> {
  const 제목자리 = await new 맨위줄(driver).제목.getLocation();
  const 칸자리 = await 칸.getLocation();
  return 칸자리.x > 제목자리.x;
}
