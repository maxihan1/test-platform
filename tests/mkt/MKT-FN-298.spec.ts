import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 원, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-298',
  name: '장바구니 줄 수량을 2로 늘리면 줄 금액이 판매가의 2배로 바로 바뀐다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 수량 1로 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};
  const 상품 = await 상품조회(page.request, 상품번호.USB허브);

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품.id]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 수량 1로 있다', (await 장바구니조회(page.request)).map((줄) => 줄.qty).join(', '), '1', { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄수량칸(상품.name).waitFor();
      await verify('장바구니 줄 수량이 1이다', await 장바구니.줄수량칸(상품.name).inputValue(), '1', { blocker: true });
    });

    await test.step('장바구니 줄의 수량 「+」를 누른다', async () => {
      await 장바구니.줄수량늘리기(상품.name);
      await 장바구니.줄수량기다리기(상품.name, 2);
      await verify('장바구니 줄 수량을 2로 늘리면 줄 금액이 판매가의 2배로 바로 바뀐다', await 장바구니.줄금액(상품.name).innerText(), 원(상품.salePrice * 2));
      await verify('결제 요약의 「상품 금액」도 바로 바뀐다', await 장바구니.요약상품금액.innerText(), 원(상품.salePrice * 2));
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
