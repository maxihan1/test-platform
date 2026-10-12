import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 장바구니보기, 상품두줄담기, 주문서주소 } from './helpers/cart.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-377',
  name: '주소 검색 결과를 누르면 주문서 우편번호 칸에 「06236」이 들어간다',
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 줄번호들: number[] = [];
  const 주문서 = new 주문서화면(page);

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

    await test.step('주문서 「주소 검색」 창에서 「테헤란로」를 검색하고 결과를 누른다', async () => {
      await 주문서.주소검색으로채우기('테헤란로');
      await verify('주소 검색 결과를 누르면 주문서 우편번호 칸에 「06236」이 들어간다', await 주문서.우편번호.inputValue(), '06236');
    });
  } finally {
    await 탈퇴(page.request);
  }
});
