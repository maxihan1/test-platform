import { defineCase, test, verify } from '@platform/kit';

import type { Page } from '@playwright/test';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주소검색창 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-319',
  name: '「주소 검색」을 누르면 주소 검색 새 창이 열린다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};
  let 새창: Page | undefined;

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
    });

    await test.step('주문서에서 「주소 검색」을 누른다', async () => {
      새창 = await 주문서.주소검색창열기();
      const 검색창 = new 주소검색창(새창);
      await 검색창.제목.waitFor();
      await verify('「주소 검색」을 누르면 주소 검색 새 창이 열린다', new URL(새창.url()).pathname, '/popup/address');
    });

    await test.step('새 창에서 「테헤란」을 검색하고 첫 결과를 고른다', async () => {
      if (!새창) throw new Error('주소 검색 새 창이 열려 있지 않다');
      const 검색창 = new 주소검색창(새창);
      await 검색창.검색하기('테헤란');
      const 고른것 = await 검색창.첫결과의우편번호와주소();
      await 검색창.첫결과고르기();
      await 주문서.주소채워짐기다리기();
      await verify('결과를 고르면 주소 검색 새 창이 닫힌다', await 주문서.창이닫혔나(새창), true);
      await verify('주문서의 우편번호 · 주소 칸이 고른 주소로 채워진다', `${await 주문서.우편번호칸.inputValue()} / ${await 주문서.주소칸.inputValue()}`, 고른것);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
