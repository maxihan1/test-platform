import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-UI-213',
  name: '배송 요청 사항 드롭다운에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」이 있다',
  precondition: ['장바구니에 상품이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('주문서 1단계를 연다', async () => {
      await 주문서.열기([담음.줄번호]);
      const 항목들 = await 주문서.배송요청항목들.allInnerTexts();
      await verify('배송 요청 사항 드롭다운에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」이 있다', ['문 앞에 놓아 주세요', '경비실에 맡겨 주세요', '직접 입력'].every((글) => 항목들.includes(글)), true);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
