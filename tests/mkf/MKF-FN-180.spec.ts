import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 날짜글, 며칠뒤, 장바구니보기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-180',
  name: '오늘로부터 1일 뒤는 배송 희망일로 고를 수 없는 날이다',
  techniques: ['경계값 분석'],
  precondition: ['장바구니에 상품이 담긴 회원으로 로그인해 있다'],
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
      await verify('주문서 배송 정보 단계가 열려 있다', await 주문서.현재단계글(), '① 배송 정보', { blocker: true });
    });

    await test.step('배송 희망일 칸에 오늘로부터 1일 뒤 날짜를 넣는다', async () => {
      await 주문서.배송희망일.fill(날짜글(며칠뒤(1)));
      await verify('오늘로부터 1일 뒤는 배송 희망일로 고를 수 없는 날이다', await 주문서.배송희망일범위안인가(), false);
    });

    await test.step('배송 희망일 칸에 오늘로부터 2일 뒤 날짜를 넣는다', async () => {
      await 주문서.배송희망일.fill(날짜글(며칠뒤(2)));
      await verify('오늘로부터 2일 뒤는 배송 희망일로 고를 수 있는 날이다', await 주문서.배송희망일범위안인가(), true);
    });

    await test.step('배송 희망일 칸에 오늘로부터 14일 뒤 날짜를 넣는다', async () => {
      await 주문서.배송희망일.fill(날짜글(며칠뒤(14)));
      await verify('오늘로부터 14일 뒤는 배송 희망일로 고를 수 있는 날이다', await 주문서.배송희망일범위안인가(), true);
    });

    await test.step('배송 희망일 칸에 오늘로부터 15일 뒤 날짜를 넣는다', async () => {
      await 주문서.배송희망일.fill(날짜글(며칠뒤(15)));
      await verify('오늘로부터 15일 뒤는 배송 희망일로 고를 수 없는 날이다', await 주문서.배송희망일범위안인가(), false);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
