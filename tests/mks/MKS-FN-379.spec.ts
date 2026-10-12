import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 장바구니보기, 상품두줄담기, 주문서주소 } from './helpers/cart.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';
import { 일요일아닌배송일 } from './helpers/order.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-379',
  name: '동의를 켜지 않으면 결제하기 버튼이 비활성이다',
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 줄번호들: number[] = [];
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());

  try {
    await test.step('임시 회원으로 가입해 상품 두 줄을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      줄번호들 = await 상품두줄담기(page.request);
    });

    await test.step('장바구니에 상품 두 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 두 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 2, { blocker: true });
    });

    await test.step('주문서를 열어 둔다', async () => {
      await 주문서.열기(주문서주소(줄번호들));
    });

    await test.step('주문서 배송 정보 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 배송 정보 단계가 열려 있다', await 주문서.현재단계글(), '① 배송 정보', { blocker: true });
    });

    await test.step('배송 정보를 채우고 「다음」을 눌러 결제 수단 단계로 간다', async () => {
      await 주문서.결제수단단계로가기(배송);
    });

    await test.step('주문서 결제 수단 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 결제 수단 단계가 열려 있다', await 주문서.현재단계글(), '② 결제 수단', { blocker: true });
    });

    await test.step('결제 수단을 고르고 「다음」을 눌러 최종 확인 단계로 간다', async () => {
      await 주문서.신용카드.check();
      await 주문서.다음누르기();
      await 주문서.동의.waitFor();
    });

    await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
    });

    await test.step('주문서 최종 확인 단계에서 동의 체크박스를 켜지 않는다', async () => {
      await verify('동의를 켜지 않으면 결제하기 버튼이 비활성이다', await 주문서.결제하기.isDisabled(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
