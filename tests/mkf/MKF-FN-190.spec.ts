import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 모킹줄번호, 장바구니모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-190',
  name: '조건이 맞지 않는 「3,000원 할인」 쿠폰은 흐리게 보인다',
  techniques: ['동등 분할'],
  precondition: ['주문 금액이 29,999원인 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('주문서 2단계의 쿠폰 드롭다운을 확인한다', async () => {
      const 해제 = await 장바구니모킹(page, 29999);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await verify('주문서 결제 금액이 시험할 금액이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 32,999원', { blocker: true });
        await verify('조건이 맞지 않는 「3,000원 할인」 쿠폰은 흐리게 보인다', await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isDisabled(), true);
      } finally {
        await 해제();
      }
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
