import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 내주문모두취소, 최종확인단계로 } from './helpers/checkout-flow.helper.js';
import { 응답붙잡기 } from './helpers/common-tools.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기, 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-229',
  name: '주문 응답을 늦춘 채 「{금액}원 결제하기」를 누르면 응답 전까지 버튼이 눌리지 않는다',
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  let 붙잡음: Awaited<ReturnType<typeof 응답붙잡기>> | undefined;
  let 풀었나 = false;
  const 완료 = new 주문완료화면(page);
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

    await test.step('배송 정보와 결제 수단을 채워 최종 확인 단계로 간다', async () => {
      await 최종확인단계로(주문서, 배송);
    });

    await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
    });

    await test.step('주문 응답을 늦춘 채 「{금액}원 결제하기」를 누른다', async () => {
      붙잡음 = await 응답붙잡기(page, '**/api/orders');
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 주문서.로딩표시.waitFor();
      await verify('주문 응답을 늦춘 채 「{금액}원 결제하기」를 누르면 응답 전까지 버튼이 눌리지 않는다', await 주문서.결제중버튼.isDisabled(), true);
      await verify(
        '주문 응답을 늦춘 채 「{금액}원 결제하기」를 누르면 응답 전까지 버튼 글자 대신 로딩 표시가 보인다',
        [await 주문서.로딩표시.isVisible(), (await 주문서.결제중버튼.innerText()).trim()],
        [true, ''],
      );
    });

    await test.step('늦춘 주문 응답을 보내 주문을 끝낸다', async () => {
      풀었나 = true;
      await 붙잡음?.풀기();
      await 완료.제목.waitFor();
    });
  } finally {
    if (붙잡음 !== undefined && !풀었나) await 붙잡음.풀기();
    await 내주문모두취소(page.request);
    await 탈퇴(page.request);
  }
});
