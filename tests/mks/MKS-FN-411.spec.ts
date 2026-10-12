import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 장바구니보기, 상품두줄담기, 주문서주소 } from './helpers/cart.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';
import { 범위안일요일, 일요일아닌배송일 } from './helpers/order.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-411',
  name: '배송 희망일을 일요일로 넣으면 「일요일은 배송하지 않습니다」가 보인다',
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

    await test.step('주문서 배송 희망일에 범위 안의 일요일을 넣고 「다음」을 누른다', async () => {
      await 주문서.배송정보채우기({ ...배송, 배송희망일: 범위안일요일() });
      await 주문서.다음누르기();
      await 주문서.다음누른결과기다리기();
      await verify('배송 희망일을 일요일로 넣으면 「일요일은 배송하지 않습니다」가 보인다', await 주문서.오류글('일요일은 배송하지 않습니다').isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
