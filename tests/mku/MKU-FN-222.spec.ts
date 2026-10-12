import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 숫자만, 모킹줄번호, 장바구니모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-222',
  name: '상품 금액이 29,999원이면 쿠폰 「3,000원 할인 (30,000원 이상 구매 시)」을 고를 수 없다',
  techniques: ['경계값 분석'],
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

    await test.step('상품 금액이 29,999원인 주문서에서 쿠폰 드롭다운을 연다', async () => {
      const 해제 = await 장바구니모킹(page, 29999);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await verify('주문서 결제 금액이 시험할 금액이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 32,999원', { blocker: true });
        await 주문서.쿠폰.focus();
        await verify('상품 금액이 29,999원이면 쿠폰 「3,000원 할인 (30,000원 이상 구매 시)」을 고를 수 없다', await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isDisabled(), true);
      } finally {
        await 해제();
      }
    });

    await test.step('상품 금액이 30,000원인 주문서에서 쿠폰 드롭다운을 연다', async () => {
      const 해제 = await 장바구니모킹(page, 30000);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await verify('주문서 결제 금액이 시험할 금액이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 33,000원', { blocker: true });
        await 주문서.쿠폰.focus();
        await verify('상품 금액이 30,000원이면 쿠폰 「3,000원 할인 (30,000원 이상 구매 시)」을 고를 수 있다', !(await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isDisabled()), true);
      } finally {
        await 해제();
      }
    });

    await test.step('상품 금액이 50,000원인 주문서에서 「10% 할인 (최대 5,000원)」을 고른다', async () => {
      const 해제 = await 장바구니모킹(page, 50000);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
        const 결제금액 = 숫자만(await 주문서.결제금액미리보기.innerText());
        await verify('상품 금액 50,000원에 10% 쿠폰을 쓰면 할인이 5,000원이다', 50000 - 결제금액, 5000);
      } finally {
        await 해제();
      }
    });

    await test.step('상품 금액이 50,010원인 주문서에서 「10% 할인 (최대 5,000원)」을 고른다', async () => {
      const 해제 = await 장바구니모킹(page, 50010);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
        const 할인 = 50010 - 숫자만(await 주문서.결제금액미리보기.innerText());
        await verify('10% 쿠폰이 적용돼 결제 금액이 줄었다', 할인 > 0, true, { blocker: true });
        await verify('상품 금액 50,010원에 10% 쿠폰을 써도 할인이 5,000원을 넘지 않는다', 할인 <= 5000, true);
      } finally {
        await 해제();
      }
    });
  } finally {
    await 탈퇴(page.request);
  }
});
