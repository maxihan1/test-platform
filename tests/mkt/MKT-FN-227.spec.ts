import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품정보, 장바구니보기, 일요일아닌배송일, 주문취소 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-227',
  name: '결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴 주문번호가 보인다',
  precondition: ['새로 가입한 회원이 주문서 결제 수단까지 채워 최종 확인 단계에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 만든주문: string[] = [];
  const 완료 = new 주문완료화면(page);
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
      await verify('주문서 배송 정보 단계가 열려 있다', (await 주문서.현재단계글()), '① 배송 정보', { blocker: true });
    });

    await test.step('배송 정보를 채워 결제 수단 단계로 간다', async () => {
      await 주문서.배송정보채우기(배송);
      await 주문서.다음누르기();
    });

    await test.step('주문서 결제 수단 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 결제 수단 단계가 열려 있다', (await 주문서.현재단계글()), '② 결제 수단', { blocker: true });
    });

    await test.step('결제 수단을 골라 최종 확인 단계로 간다', async () => {
      await 주문서.결제수단고르기('계좌이체');
      await 주문서.다음누르기();
    });

    await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 최종 확인 단계가 열려 있다', (await 주문서.현재단계글()), '③ 최종 확인', { blocker: true });
    });

    await test.step('결제 동의를 켜고 「{금액}원 결제하기」를 누른다', async () => {
      const 최종 = (await 주문서.금액표())['최종 결제 금액'];
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 완료.제목.waitFor();
      만든주문 = [(await 완료.주문번호.innerText()).trim()];
      await verify('결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴 주문번호가 보인다', /^DM\d{8}-\d{4}$/.test(만든주문[0] ?? ''), true);
      await verify('주문 완료 화면에 최종 확인에서 본 결제 금액이 보인다', (await 완료.결제금액.innerText()).trim() === 최종, true);
      await verify('주문 완료 화면에 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다', (await 완료.주문내역보기.isVisible()) && (await 완료.쇼핑계속하기.isVisible()), true);
      await verify('주문한 상품은 장바구니에서 빠진다', !(await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true);
      await verify('주문하면 그 상품 재고가 주문 수량만큼 줄어든다', (await 상품정보(page.request, 담음.상품.id)).stock === 담음.재고전 - 담음.수량, true);
    });
  } finally {
    for (const 번호 of 만든주문) await 주문취소(page.request, 번호);
    await 탈퇴(page.request);
  }
});
