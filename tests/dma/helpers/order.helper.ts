import { 주문하기화면, type 주문서값 } from '../pages/checkout.page.js';
import { 주문내역화면 } from '../pages/order-list.page.js';
import { 주문상세화면 } from '../pages/order-detail.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import { type 앱, 기기오늘 } from './app.helper.js';
import { 목록으로돌아가기, 상품상세열기 } from './cart.helper.js';

export async function 바로구매열기(driver: 앱, 상품이름: string): Promise<주문하기화면> {
  const 상세 = await 상품상세열기(driver, 상품이름);
  await 상세.옵션다고르기();
  await 상세.바로구매();
  const 주문하기 = new 주문하기화면(driver);
  await 주문하기.열릴때까지();
  return 주문하기;
}

export async function 주문만들기(driver: 앱, 상품이름: string, 값: 주문서값): Promise<string> {
  const 주문하기 = await 바로구매열기(driver, 상품이름);
  await 주문하기.다채우기(값, await 기기오늘(driver));
  await 주문하기.결제누르기();
  const 상세 = new 주문상세화면(driver);
  await 상세.열릴때까지();
  return 상세.주문번호글();
}

export async function 주문내역열기(driver: 앱): Promise<주문내역화면> {
  await 목록으로돌아가기(driver);
  await new 상품목록화면(driver).주문내역누르기();
  const 내역 = new 주문내역화면(driver);
  await 내역.열릴때까지();
  return 내역;
}

export async function 주문번호로열기(driver: 앱, 번호: string): Promise<주문상세화면> {
  const 내역 = await 주문내역열기(driver);
  const 카드 = await 내역.주문번호로찾기(번호);
  if (카드 === undefined) throw new Error(`주문 내역에서 「${번호}」 주문을 찾지 못했다`);
  await 내역.주문열기(카드);
  const 상세 = new 주문상세화면(driver);
  await 상세.열릴때까지();
  return 상세;
}

export async function 상태로열기(driver: 앱, 상태: string): Promise<주문상세화면 | undefined> {
  const 내역 = await 주문내역열기(driver);
  const 카드 = await 내역.상태로찾기(상태);
  if (카드 === undefined) return undefined;
  await 내역.주문열기(카드);
  const 상세 = new 주문상세화면(driver);
  await 상세.열릴때까지();
  return 상세;
}

export async function 취소된주문열기(driver: 앱, 상품이름: string, 값: 주문서값): Promise<주문상세화면> {
  const 있던것 = await 상태로열기(driver, '주문취소');
  if (있던것 !== undefined) return 있던것;
  await 목록으로돌아가기(driver);
  const 번호 = await 주문만들기(driver, 상품이름, 값);
  const 상세 = new 주문상세화면(driver);
  await 상세.취소창열기();
  await 상세.사유고르기('단순 변심');
  await 상세.취소하기누르기();
  await 상세.취소사유줄뜰때까지();
  return 주문번호로열기(driver, 번호);
}
