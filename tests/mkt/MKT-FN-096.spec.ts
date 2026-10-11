import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니로주문서열기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주소검색창 } from './pages/address-popup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-096',
  name: '결제 수단 단계에서 「이전」 을 누르면 배송 정보 입력값이 남아 있다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 입력 = 정상배송입력();
  let 검색창: 주소검색창 | undefined;
  let 새창: Page | undefined;

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('주문서 배송 정보 단계를 확인한다', async () => {
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('결제 수단 단계에서 「이전」 을 누른다', async () => {
    await 주문서.배송정보채우기(입력);
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await 주문서.이전누르기();
    await 주문서.받는분.waitFor();
    await verify('결제 수단 단계에서 「이전」 을 누르면 배송 정보 입력값이 남아 있다', await 주문서.배송정보읽기(), 입력);
  });

  await test.step('배송 요청 사항에서 「직접 입력」 을 고른다', async () => {
    await 주문서.요청사항.selectOption({ label: '직접 입력' });
    await verify('배송 요청 사항에서 「직접 입력」 을 고르면 입력칸이 새로 보인다', await 주문서.요청직접입력.isVisible(), true);
  });

  await test.step('「주소 검색」 을 누른다', async () => {
    const [창] = await Promise.all([page.waitForEvent('popup'), 주문서.주소검색버튼.click()]);
    새창 = 창;
    검색창 = new 주소검색창(창);
    await 검색창.제목.waitFor();
    await verify('「주소 검색」 을 누르면 새 창으로 주소 검색이 열린다', new URL(창.url()).pathname, 주소검색창.주소);
  });

  await test.step('주소 검색 창에서 검색어를 넣고 결과 하나를 고른다', async () => {
    if (검색창 === undefined || 새창 === undefined) throw new Error('주소 검색 창이 열려 있지 않다');
    await 주문서.주소비우기();
    await 검색창.검색하기('테헤');
    const 고른것 = await 검색창.첫결과글();
    await Promise.all([새창.waitForEvent('close'), 검색창.첫결과고르기()]);
    await 주문서.주소채워짐기다리기();
    await verify(
      '주소 검색 창에서 결과를 고르면 창이 닫히고 우편번호 · 주소 칸이 채워진다',
      { 창닫힘: 새창.isClosed(), 우편번호: await 주문서.우편번호.inputValue(), 주소: await 주문서.주소.inputValue() },
      { 창닫힘: true, 우편번호: 고른것.우편번호, 주소: 고른것.주소 },
    );
  });

  await test.step('배송 정보를 채우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기(입력);
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await verify(
      '결제 수단 단계에 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오가 보인다',
      [await 주문서.결제수단('신용카드').isVisible(), await 주문서.결제수단('계좌이체').isVisible(), await 주문서.결제수단('무통장입금').isVisible()],
      [true, true, true],
    );
  });

  await test.step('결제 수단에서 「신용카드」 를 고른다', async () => {
    await 주문서.결제수단고르기('신용카드');
    await verify(
      '「신용카드」 를 고르면 카드사 드롭다운과 할부 드롭다운 「일시불」 · 「3개월」 · 「6개월」 이 보인다',
      { 카드사: await 주문서.카드사.isVisible(), 할부: await 주문서.할부.locator('option').allInnerTexts() },
      { 카드사: true, 할부: ['일시불', '3개월', '6개월'] },
    );
  });

  await test.step('결제 수단을 고르고 「다음」 을 누른다', async () => {
    await 주문서.결제수단고르기('신용카드');
    await 주문서.다음누르기();
    await 주문서.최종확인단계.waitFor();
    await verify('최종 확인 단계에 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다', await 주문서.최종확인항목보임(), ['상품 목록', '배송 정보', '결제 수단', '결제 금액']);
  });

  await test.step('최종 확인 단계의 금액을 확인한다', async () => {
    const 금액 = await 주문서.금액요약읽기();
    await verify('최종 결제 금액이 상품 금액 − 쿠폰 할인 + 배송비와 같다', 금액['최종 결제 금액'], 금액['상품 금액'] + 금액['쿠폰 할인'] + 금액['배송비']);
  });

  await test.step('10% 쿠폰을 고르고 최종 확인 단계로 간다', async () => {
    await 주문서.이전누르기();
    await 주문서.결제수단단계.waitFor();
    await 주문서.쿠폰고르기('10% 할인');
    await 주문서.다음누르기();
    await 주문서.최종확인단계.waitFor();
    const 금액 = await 주문서.금액요약읽기();
    await verify('10% 쿠폰을 써도 배송비는 쿠폰 적용 전 상품 금액으로 정해진다', 금액['배송비'], 금액['상품 금액'] >= 50000 ? 0 : 3000);
  });
});
