import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 최종확인단계로 } from './helpers/checkout-flow.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일, 장바구니보기 } from './helpers/shop.helper.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-191',
  name: '3단계 최종 확인에 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다',
  precondition: ['장바구니에 상품이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('주문서를 열어 둔다', async () => {
      await 주문서.열기([담음.줄번호]);
    });

    await test.step('주문서 배송 정보 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 배송 정보 단계가 열려 있다', await 주문서.현재단계글(), '① 배송 정보', { blocker: true });
    });

    await test.step('1 · 2단계를 채우고 3단계로 간다', async () => {
      await 최종확인단계로(주문서, 배송);
      await verify('3단계 최종 확인에 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다', [await 주문서.상품목록제목.isVisible(), await 주문서.배송정보제목.isVisible(), await 주문서.결제수단제목.isVisible(), await 주문서.결제금액제목.isVisible()], [true, true, true, true]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
