import { 토스트 } from '../components/toast.component.js';
import { 장바구니화면 } from '../pages/cart.page.js';
import { 상품상세화면 } from '../pages/product-detail.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import type { 앱 } from './app.helper.js';

export async function 장바구니열기(driver: 앱): Promise<장바구니화면> {
  await new 상품목록화면(driver).장바구니누르기();
  const 장바구니 = new 장바구니화면(driver);
  await 장바구니.열릴때까지();
  return 장바구니;
}

export async function 목록으로돌아가기(driver: 앱): Promise<void> {
  const 목록 = new 상품목록화면(driver);
  for (let 번 = 0; 번 < 4 && !(await 목록.보이나()); 번 += 1) await driver.back();
  await 목록.열릴때까지();
}

export async function 상품상세열기(driver: 앱, 상품이름: string): Promise<상품상세화면> {
  await new 상품목록화면(driver).상품열기(상품이름);
  const 상세 = new 상품상세화면(driver);
  await 상세.열릴때까지();
  return 상세;
}

export async function 상품담기(driver: 앱, 상품이름: string): Promise<void> {
  const 상세 = await 상품상세열기(driver, 상품이름);
  await 상세.옵션다고르기();
  await 상세.담기();
  await new 토스트(driver).뜰때까지();
  await 목록으로돌아가기(driver);
}

export async function 장바구니줄지우기(driver: 앱, 상품이름: string): Promise<void> {
  await 목록으로돌아가기(driver);
  const 장바구니 = await 장바구니열기(driver);
  if ((await 장바구니.줄찾기(상품이름)) !== undefined) {
    await 장바구니.한줄만체크(상품이름);
    await 장바구니.선택삭제누르기();
    await 장바구니.확인창뜰때까지();
    await 장바구니.확인창삭제누르기();
    await driver.waitUntil(async () => (await 장바구니.줄찾기(상품이름)) === undefined, {
      timeout: 15000,
      interval: 300,
      timeoutMsg: `장바구니에서 「${상품이름}」 줄이 지워지지 않았다`,
    });
  }
  await 목록으로돌아가기(driver);
}

export async function 장바구니수량되돌리기(driver: 앱, 상품이름: string, 수량: number): Promise<void> {
  const 장바구니 = new 장바구니화면(driver);
  if (!(await 장바구니.보이나())) {
    await 목록으로돌아가기(driver);
    await 장바구니열기(driver);
  }
  for (let 번 = 0; 번 < 12; 번 += 1) {
    const 줄 = await 장바구니.줄찾기(상품이름);
    if (줄 === undefined) return;
    const 지금 = await 장바구니.줄수량(줄);
    if (지금 === 수량) return;
    if (지금 > 수량) await 장바구니.줄빼기(줄);
    else await 장바구니.줄더하기(줄);
    await 장바구니.수량이될때까지(상품이름, 지금 > 수량 ? 지금 - 1 : 지금 + 1);
  }
}
