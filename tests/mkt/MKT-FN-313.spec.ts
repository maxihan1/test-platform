import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면, type 배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-313',
  name: '배송 정보를 맞게 채우고 「다음」을 누르면 「② 결제 수단」 단계가 강조된다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};
  let 적은것: 배송값 | undefined;

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니에서 주문서를 연다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await verify('주문서 「① 배송 정보」 단계가 열려 있다', await 주문서.현재단계이름(), '① 배송 정보', { blocker: true });
    });

    await test.step('주문서 배송 정보를 맞게 채우고 「다음」을 누른다', async () => {
      await 주문서.배송정보채우기();
      적은것 = await 주문서.배송정보값();
      await 주문서.다음버튼.click();
      await 주문서.결제수단('신용카드').waitFor();
      await 주문서.결제단계준비기다리기();
      await verify('배송 정보를 맞게 채우고 「다음」을 누르면 「② 결제 수단」 단계가 강조된다', await 주문서.현재단계이름(), '② 결제 수단');
    });

    await test.step('결제 수단 단계에서 「이전」을 누른다', async () => {
      await 주문서.이전버튼.click();
      await 주문서.받는분칸.waitFor();
      await verify('「이전」으로 돌아가면 배송 정보에 적은 값이 남아 있다', await 주문서.배송정보값(), 적은것);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
