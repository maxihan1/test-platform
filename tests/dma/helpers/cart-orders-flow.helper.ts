import { 장바구니화면 } from '../pages/cart.page.js';
import type { 결제수단, 주문서값 } from '../pages/checkout.page.js';
import { 주문내역화면 } from '../pages/order-list.page.js';
import { 주문상세화면 } from '../pages/order-detail.page.js';
import type { 앱 } from './app.helper.js';
import { 될때까지기다려보기 } from './wait.helper.js';

export const 스마트워치 = '스마트 워치';
export const 오버핏후드티 = '오버핏 후드티';
export const 옵션글꼴 = /^\S+ \/ \S+$/;

export interface 주문서칸들 {
  receiver: string;
  phone: string;
  keyword: string;
  detail: string;
  payment: 결제수단;
}

export function 주문서값으로(칸들: 주문서칸들): 주문서값 {
  return {
    받는분: 칸들.receiver,
    연락처: 칸들.phone,
    검색어: 칸들.keyword,
    상세주소: 칸들.detail,
    결제수단: 칸들.payment,
  };
}

export async function 기본줄있나(장바구니: 장바구니화면): Promise<boolean> {
  return (await 장바구니.줄찾기(스마트워치)) !== undefined && (await 장바구니.줄찾기(오버핏후드티)) !== undefined;
}

export async function 체크한줄금액합(장바구니: 장바구니화면): Promise<number> {
  let 합 = 0;
  for (const 줄 of await 장바구니.줄들()) {
    if (await 장바구니.줄체크했나(줄)) 합 += await 장바구니.줄금액(줄);
  }
  return 합;
}

export async function 더하기끝까지누르기(driver: 앱, 장바구니: 장바구니화면, 이름: string, 최대 = 12): Promise<number> {
  for (let 번 = 0; 번 < 최대; 번 += 1) {
    const 줄 = await 장바구니.줄꼭찾기(이름);
    if (!(await 장바구니.줄더하기눌리나(줄))) break;
    const 앞 = await 장바구니.줄수량(줄);
    await 장바구니.줄더하기(줄);
    await 될때까지기다려보기(driver, async () => (await 장바구니.줄수량(await 장바구니.줄꼭찾기(이름))) !== 앞, 3000);
    if ((await 장바구니.줄수량(await 장바구니.줄꼭찾기(이름))) === 앞) break;
  }
  return 장바구니.줄수량(await 장바구니.줄꼭찾기(이름));
}

export function 카드날짜줄(글: string[]): string | undefined {
  return 글.find((칸) => /^\S.* · [\d,]+원$/.test(칸));
}

export function 카드날짜(글: string[]): Date | undefined {
  const 줄 = 카드날짜줄(글);
  const 찾음 = 줄 === undefined ? null : /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(줄.split(' · ')[0] ?? '');
  return 찾음 === null ? undefined : new Date(Number(찾음[1]), Number(찾음[2]) - 1, Number(찾음[3]));
}

export function 석달넘었나(날: Date, 오늘: Date): boolean {
  return 날.getTime() < new Date(오늘.getFullYear(), 오늘.getMonth() - 3, 오늘.getDate()).getTime();
}

export function 최신순인가(날들: (Date | undefined)[]): boolean {
  return (
    날들.length > 0 &&
    날들.every((날, 번) => {
      const 앞 = 번 === 0 ? undefined : 날들[번 - 1];
      return 날 !== undefined && (번 === 0 || (앞 !== undefined && 앞.getTime() >= 날.getTime()));
    })
  );
}

export async function 상품여럿인주문찾기(driver: 앱): Promise<{ 번호: string; 줄수: number } | undefined> {
  const 내역 = new 주문내역화면(driver);
  const 번호들: string[] = [];
  for (const 카드 of await 내역.카드들()) 번호들.push(await 내역.카드주문번호(카드));
  for (const 번호 of 번호들) {
    const 카드 = await 내역.주문번호로찾기(번호);
    if (카드 === undefined) continue;
    await 내역.주문열기(카드);
    const 상세 = new 주문상세화면(driver);
    await 상세.열릴때까지();
    const 줄수 = (await 상세.상품줄글들()).length;
    await driver.back();
    await 내역.열릴때까지();
    if (줄수 >= 2) return { 번호, 줄수 };
  }
  return undefined;
}
