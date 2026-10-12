import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 금액을맞춰담기, 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 숫자만 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 일요일아닌배송일, 장바구니보기 } from './helpers/shop.helper.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-193',
  name: '쿠폰을 써서 50,000원 아래로 내려가도 상품 금액이 50,000원 이상이면 배송비가 0원이다',
  precondition: ['상품 금액 51,600원이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());
  let 줄번호 = 0;

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('상품 금액 51,600원이 되게 장바구니에 상품을 담는다', async () => {
      줄번호 = (await 금액을맞춰담기(page.request, 51600)).줄번호;
    });

    await test.step('장바구니에 상품 금액 51,600원이 담겼는지 확인한다', async () => {
      await verify('장바구니 상품 금액 합이 51,600원이다', (await 장바구니보기(page.request)).reduce((합, 줄) => 합 + 줄.unitPrice * 줄.qty, 0), 51600, { blocker: true });
    });

    await test.step('주문서를 열어 둔다', async () => {
      await 주문서.열기([줄번호]);
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
      await verify('쿠폰을 쓴 최종 결제 금액이 50,000원 아래다', 숫자만(금액['최종 결제 금액'] ?? '') < 50000, true, { blocker: true });
      await verify('쿠폰을 써서 50,000원 아래로 내려가도 상품 금액이 50,000원 이상이면 배송비가 0원이다', 금액['배송비'], '0원');
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
