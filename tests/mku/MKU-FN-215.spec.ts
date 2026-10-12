import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기, 닫힘기다리개 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 주소검색창 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-215',
  name: '주소 검색 창에서 결과를 고르면 새 창이 닫힌다',
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);

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

    await test.step('주소 검색 창에서 검색해 결과를 고른다', async () => {
      const 팝업 = new 주소검색창(await 주문서.주소검색열기());
      await 팝업.검색하기('테헤란');
      const 고른글 = await 팝업.첫결과글();
      const 닫힘 = 닫힘기다리개(팝업.page);
      await 팝업.첫결과고르기();
      await verify('주소 검색 창에서 결과를 고르면 새 창이 닫힌다', await 닫힘, true);
      await 주문서.상세주소포커스.waitFor();
      await verify('주소를 고르면 주문서 우편번호와 주소 칸이 채워진다', (await 주문서.우편번호.inputValue()) + (await 주문서.주소.inputValue()) === 고른글, true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
