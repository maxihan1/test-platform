import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 결제하고완료기다리기, 내주문모두취소, 최종확인단계로 } from './helpers/checkout-flow.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품정보, 장바구니보기, 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-234',
  name: '주문하면 그 상품 재고가 주문 수량만큼 줄어든다',
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
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

    await test.step('담은 상품을 결제한 뒤 상품 재고를 본다', async () => {
      await 결제하고완료기다리기(주문서, 완료);
      await verify('주문하면 그 상품 재고가 주문 수량만큼 줄어든다', (await 상품정보(page.request, 담음.상품.id)).stock, 담음.재고전 - 담음.수량);
    });
  } finally {
    await 내주문모두취소(page.request);
    await 탈퇴(page.request);
  }
});
