import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 결제하고완료기다리기, 최종확인단계로 } from './helpers/checkout-flow.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품정보, 일요일아닌배송일, 장바구니보기 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-197',
  name: '주문하면 주문한 상품이 장바구니에서 빠진다',
  precondition: ['장바구니에 상품이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());
  const 완료 = new 주문완료화면(page);
  let 결제: { 최종금액: string; 주문번호: string } = { 최종금액: '', 주문번호: '' };

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('배송 정보와 결제 수단을 채워 최종 확인 단계로 간다', async () => {
      await 주문서.열기([담음.줄번호]);
      await 최종확인단계로(주문서, 배송);
    });

    await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
    });

    await test.step('주문서를 끝까지 채우고 「결제하기」를 누른다', async () => {
      결제 = await 결제하고완료기다리기(주문서, 완료);
      await verify('주문하면 주문한 상품이 장바구니에서 빠진다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), false);
    });

    await test.step('주문 전후 그 상품 재고를 확인한다', async () => {
      await verify('주문하면 그 상품 재고가 주문 수량만큼 줄어든다', (await 상품정보(page.request, 담음.상품.id)).stock, 담음.재고전 - 담음.수량);
    });

    await test.step('주문을 마쳐 주문 완료 화면을 본다', async () => {
      await verify('주문 완료 화면의 주문번호는 「DM」 + 날짜 8자리 + 「-」 + 4자리 숫자 꼴이다', /^DM\d{8}-\d{4}$/.test(결제.주문번호), true);
    });

    await test.step('주문 완료 화면의 결제 금액을 확인한다', async () => {
      await verify('주문 완료 화면에 결제한 금액이 보인다', (await 완료.결제금액.innerText()).trim(), 결제.최종금액);
    });

    await test.step('주문 완료 화면의 버튼을 확인한다', async () => {
      await verify('주문 완료 화면에 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다', [await 완료.주문내역보기.isVisible(), await 완료.쇼핑계속하기.isVisible()], [true, true]);
    });
  } finally {
    await 임시회원치우기(page.request, true);
  }
});
