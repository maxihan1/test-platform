import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-382',
  name: '요청 직접 입력 칸에 50자를 넣으면 50자가 다 들어간다',
  techniques: ['경계값 분석'],
  precondition: ['새로 가입한 회원이 상품을 담고 주문서를 열어 두었다'],
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

    await test.step('「직접 입력」을 고르고 요청 칸에 50자를 넣는다', async () => {
      await 주문서.배송요청.selectOption({ label: '직접 입력' });
      await 주문서.요청직접입력.fill('가'.repeat(50));
      await verify('요청 직접 입력 칸에 50자를 넣으면 50자가 다 들어간다', (await 주문서.요청직접입력.inputValue()).length, 50);
    });

    await test.step('「직접 입력」을 고르고 요청 칸에 51자를 넣는다', async () => {
      await 주문서.열기([담음.줄번호]);
      await 주문서.배송요청.selectOption({ label: '직접 입력' });
      await 주문서.요청직접입력.fill('가'.repeat(51));
      await verify('요청 직접 입력 칸에 51자를 넣으면 50자까지만 들어간다', (await 주문서.요청직접입력.inputValue()).length, 50);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
