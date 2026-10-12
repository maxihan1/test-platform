import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기, 숫자만 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일, 장바구니보기 } from './helpers/shop.helper.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-192',
  name: '3단계 최종 결제 금액은 상품 금액 − 쿠폰 할인 + 배송비다',
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

    await test.step('배송 정보를 채워 결제 수단 단계로 간다', async () => {
      await 주문서.배송정보채우기(배송);
      await 주문서.다음누르기();
    });

    await test.step('주문서 결제 수단 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 결제 수단 단계가 열려 있다', await 주문서.현재단계글(), '② 결제 수단', { blocker: true });
    });

    await test.step('「10% 할인」 쿠폰을 고르고 3단계로 간다', async () => {
      await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
      await 주문서.결제수단고르기('계좌이체');
      await 주문서.다음누르기();
      const 금액 = await 주문서.금액표();
      await verify('쿠폰 할인이 최종 확인 단계에 보인다', 숫자만(금액['쿠폰 할인'] ?? '') > 0, true, { blocker: true });
      await verify('3단계 최종 결제 금액은 상품 금액 − 쿠폰 할인 + 배송비다', 숫자만(금액['최종 결제 금액'] ?? '') === 숫자만(금액['상품 금액'] ?? '') - 숫자만(금액['쿠폰 할인'] ?? '') + 숫자만(금액['배송비'] ?? ''), true);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
