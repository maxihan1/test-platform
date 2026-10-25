import { 토스트 } from '../components/toast.component.js';
import { 주문하기화면, type 결제수단, type 주문서값 } from '../pages/checkout.page.js';
import type { 장바구니화면 } from '../pages/cart.page.js';
import type { 주문내역화면 } from '../pages/order-list.page.js';
import type { 상품상세화면 } from '../pages/product-detail.page.js';
import { type 앱, type 요소 } from './app.helper.js';
import { 상품상세열기 } from './cart.helper.js';
import { 토스트글읽기, 토스트비우기 } from './wait.helper.js';
import { 로그인하기 } from './login.helper.js';
import { 바로구매열기 } from './order.helper.js';

const 주소비었을때글 = '주소를 검색하세요';

function 글자막기(글: string): string {
  return 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function 주문서(값: Partial<주문서값>): 주문서값 {
  return { 받는분: '', 연락처: '', 검색어: '', 상세주소: '', 결제수단: '신용카드', ...값 };
}

export async function 로그인하고주문하기열기(
  driver: 앱,
  아이디: string | undefined,
  비밀번호: string | undefined,
  상품이름: string,
): Promise<void> {
  await 로그인하기(driver, 아이디, 비밀번호);
  await 바로구매열기(driver, 상품이름);
}

export async function 옵션고르고수량바로구매열기(driver: 앱, 상품이름: string, 수량: number): Promise<void> {
  const 상세 = await 상품상세열기(driver, 상품이름);
  await 상세.옵션다고르기();
  await 수량맞추기(상세, 수량);
  await 상세.바로구매();
  await new 주문하기화면(driver).열릴때까지();
}

export async function 수량맞추기(상세: 상품상세화면, 수량: number): Promise<void> {
  for (let 지금 = await 상세.수량값(); 지금 < 수량 && (await 상세.더하기눌리나()); 지금 += 1) {
    await 상세.더하기();
    await 상세.수량이될때까지(지금 + 1);
  }
}

export async function 결제누르고토스트글(driver: 앱, 주문하기: 주문하기화면): Promise<string> {
  await 토스트비우기(driver);
  await 주문하기.결제누르기();
  return 토스트글읽기(driver);
}

export async function 눌러서바뀐토스트글(driver: 앱, 주문하기: 주문하기화면, 앞글: string): Promise<string> {
  const 상자 = new 토스트(driver);
  await 주문하기.결제누르기();
  await 상자.글이바뀔때까지(앞글).catch(() => undefined);
  return (await 상자.보이나()) ? 상자.글() : '';
}

export async function 보이게하기(주문하기: 주문하기화면, 칸: 요소): Promise<void> {
  if (await 칸.isDisplayed()) return;
  await 주문하기.보일때까지밀기(칸, true);
  await 주문하기.보일때까지밀기(칸, false);
}

export async function 보이는칸이름(주문하기: 주문하기화면, 칸: 요소): Promise<string> {
  await 보이게하기(주문하기, 칸);
  return (await 칸.isDisplayed()) ? 주문하기.칸이름(칸) : '';
}

export async function 요소글(칸: 요소): Promise<string> {
  const 글 = await 칸.getText();
  return 글 !== '' ? 글 : 칸.$('android.widget.TextView').getText();
}

export async function 보이는결제수단글(주문하기: 주문하기화면, 이름: 결제수단): Promise<string> {
  if (!(await 주문하기.결제수단보이나(이름))) return '';
  return 주문하기.결제수단이름(이름);
}

export async function 결과줄뜰때까지(driver: 앱, timeout = 15000): Promise<void> {
  await driver.waitUntil(async () => driver.$('id=address_result').isDisplayed(), {
    timeout,
    interval: 300,
    timeoutMsg: '주소 검색 결과 줄이 뜨지 않았다',
  });
}

export async function 첫결과누르기(driver: 앱): Promise<string> {
  const 줄 = await driver.$('id=address_result');
  const 글 = await 줄.getText();
  await 줄.click();
  return 글;
}

export function 주소부분(결과줄글: string): string {
  return 결과줄글.replace(/^\[\d+\]\s*/, '');
}

export async function 주소줄이채워질때까지(driver: 앱, 주문하기: 주문하기화면): Promise<void> {
  await driver.waitUntil(
    async () => {
      const 글 = await 주문하기.주소줄글();
      return 글 !== '' && 글 !== 주소비었을때글;
    },
    { timeout: 10000, interval: 300, timeoutMsg: '주소 줄에 주소가 들어가지 않았다' },
  );
}

export function 주문상품줄꼴인가(줄글들: string[], 상품이름: string, 수량: number, 옵션있음: boolean): boolean {
  const 옵션 = 옵션있음 ? ' \\(.+ / .+\\)' : '';
  return new RegExp(`^${글자막기(상품이름)}${옵션} × ${String(수량)} [\\d,]+원$`).test(줄글들.join(', '));
}

export async function 금액줄차례(주문하기: 주문하기화면): Promise<string[]> {
  const 자리들 = await 주문하기.금액줄세로자리들();
  const 이름들 = ['상품 금액', '쿠폰 할인', '배송비', '최종 결제 금액'];
  return 이름들
    .map((이름, 번) => ({ 이름, 자리: 자리들[번] ?? Number.NaN }))
    .sort((앞, 뒤) => 앞.자리 - 뒤.자리)
    .map((칸) => 칸.이름);
}

export async function 최종결제금액이바뀔때까지(주문하기: 주문하기화면, 앞값: number, driver: 앱, timeout = 10000): Promise<void> {
  await driver.waitUntil(async () => (await 주문하기.최종결제금액값()) !== 앞값, { timeout, interval: 300 });
}

export async function 앞번호앞의주문수(내역: 주문내역화면, 앞번호: string): Promise<number> {
  const 본번호: string[] = [];
  for (let 번 = 0; 번 < 6; 번 += 1) {
    for (const 카드 of await 내역.카드들()) {
      const 번호 = await 내역.카드주문번호(카드);
      if (번호 === 앞번호) return 본번호.length;
      if (!본번호.includes(번호)) 본번호.push(번호);
    }
    await 내역.아래로밀기();
  }
  throw new Error(`주문 내역에서 앞 주문 번호 「${앞번호}」를 찾지 못했다`);
}

export async function 장바구니줄뜰때까지(driver: 앱, 장바구니: 장바구니화면): Promise<void> {
  await driver.waitUntil(async () => (await 장바구니.줄수()) > 0, {
    timeout: 15000,
    interval: 300,
    timeoutMsg: '장바구니 줄이 그려지지 않았다',
  });
}
