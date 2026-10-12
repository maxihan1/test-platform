import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 모킹줄번호, 숫자만, 장바구니모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-189',
  name: '구매 금액 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다',
  techniques: ['경계값 분석'],
  precondition: ['주문 금액이 29,999원인 회원으로 로그인해 있다', '주문 금액이 30,000원인 회원으로 로그인해 있다', '주문 금액이 50,000원인 회원으로 로그인해 있다', '주문 금액이 50,010원인 회원으로 로그인해 있다'],
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

    await test.step('주문서 2단계의 쿠폰 드롭다운을 연다', async () => {
      const 해제 = await 장바구니모킹(page, 29999);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await verify('주문서 결제 금액이 시험할 금액이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 32,999원', { blocker: true });
        await verify('구매 금액 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다', await 주문서.쿠폰옵션('3,000원 할인 (30,000원 이상 구매 시)').isDisabled(), true);
      } finally {
        await 해제();
      }
    });

    await test.step('주문서 2단계에서 「3,000원 할인」 쿠폰을 고른다', async () => {
      const 해제 = await 장바구니모킹(page, 30000);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await verify('주문서 결제 금액이 시험할 금액이다', await 주문서.결제금액미리보기.innerText(), '결제 금액 33,000원', { blocker: true });
        await 주문서.쿠폰.selectOption({ label: '3,000원 할인 (30,000원 이상 구매 시)' });
        await verify('구매 금액 30,000원이면 「3,000원 할인」 쿠폰을 고를 수 있다', await 주문서.선택된쿠폰글(), '3,000원 할인 (30,000원 이상 구매 시)');
      } finally {
        await 해제();
      }
    });

    await test.step('「10% 할인 (최대 5,000원)」 쿠폰을 고르고 3단계로 간다', async () => {
      const 해제50000 = await 장바구니모킹(page, 50000);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
        await 주문서.결제수단고르기('계좌이체');
        await 주문서.다음누르기();
        await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
        const 해제50000금액 = await 주문서.금액표();
        await verify('50,000원에 10% 쿠폰을 쓰면 쿠폰 할인이 5,000원이다', 숫자만(해제50000금액['쿠폰 할인'] ?? ''), 5000);
      } finally {
        await 해제50000();
      }

      const 해제50010 = await 장바구니모킹(page, 50010);
      try {
        await 주문서.열기([모킹줄번호]);
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
        await 주문서.쿠폰.selectOption({ label: '10% 할인 (최대 5,000원)' });
        await 주문서.결제수단고르기('계좌이체');
        await 주문서.다음누르기();
        await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
        const 해제50010금액 = await 주문서.금액표();
        await verify('50,010원에 10% 쿠폰을 써도 쿠폰 할인은 5,000원이다', 숫자만(해제50010금액['쿠폰 할인'] ?? ''), 5000);
      } finally {
        await 해제50010();
      }
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
