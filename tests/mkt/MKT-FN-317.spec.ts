import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-317',
  name: '연락처가 숫자 9자면 「다음」을 눌러도 「① 배송 정보」 단계에 머문다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 상품 한 줄이 있다',
    '연락처 말고 배송 정보는 맞게 채웠다',
  ],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('주문서를 연다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await verify('주문서 「① 배송 정보」 단계가 열려 있다', await 주문서.현재단계이름(), '① 배송 정보', { blocker: true });
      await 주문서.배송정보채우기({ 연락처: '' });
      await verify('연락처 말고 배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 우편번호, 주소, 상세 주소, 배송 희망일', { blocker: true });
    });

    await test.step('연락처에 숫자 9자를 적고 「다음」을 누른다', async () => {
      await 주문서.연락처칸.fill('010123456');
      await 주문서.다음버튼.click();
      await verify('연락처가 숫자 9자면 「다음」을 눌러도 「① 배송 정보」 단계에 머문다', await 주문서.현재단계이름(), '① 배송 정보');
    });

    await test.step('연락처를 숫자 10자로 고치고 「다음」을 누른다', async () => {
      await 주문서.연락처칸.fill('0101234567');
      await 주문서.다음버튼.click();
      await verify('연락처가 숫자 10자면 「② 결제 수단」으로 넘어간다', await 주문서.현재단계이름(), '② 결제 수단');
    });

    await test.step('「이전」으로 돌아가 연락처를 숫자 11자로 고치고 「다음」을 누른다', async () => {
      await 주문서.이전버튼.click();
      await 주문서.연락처칸.fill('01012345678');
      await 주문서.다음버튼.click();
      await verify('연락처가 숫자 11자면 「② 결제 수단」으로 넘어간다', await 주문서.현재단계이름(), '② 결제 수단');
    });

    await test.step('「이전」으로 돌아가 연락처에 숫자 12자를 적는다', async () => {
      await 주문서.이전버튼.click();
      await 주문서.연락처칸.fill('010123456789');
      await verify('연락처 칸에 숫자 12자를 적으면 11자까지만 들어간다', await 주문서.연락처칸.inputValue(), '01012345678');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
