import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 모킹줄번호, 장바구니모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-226',
  name: '상품 금액 52,000원에 10% 쿠폰을 써 47,000원이 돼도 배송비는 0원이다',
  precondition: ['장바구니 응답은 가짜 응답(모킹)이다'],
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

    await test.step('상품 금액 52,000원 주문서에서 10% 쿠폰을 골라 최종 확인 단계로 간다', async () => {
      const 해제 = await 장바구니모킹(page, 52000);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
        await 주문서.결제수단고르기('계좌이체');
        await 주문서.다음누르기();
        const 금액 = await 주문서.금액표();
        await verify('최종 결제 금액이 47,000원이다', 금액['최종 결제 금액'], '47,000원', { blocker: true });
        await verify('상품 금액 52,000원에 10% 쿠폰을 써 47,000원이 돼도 배송비는 0원이다', 금액['배송비'], '0원');
      } finally {
        await 해제();
      }
    });
  } finally {
    await 탈퇴(page.request);
  }
});
