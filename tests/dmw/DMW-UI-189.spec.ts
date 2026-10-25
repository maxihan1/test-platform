import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 시험배송정보 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-189',
  name: '결제 수단에 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);

  try {
    await test.step('② 결제 수단을 연다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      const 카드 = await verify('「신용카드」 라디오가 보인다', await 주문서.결제수단라디오('신용카드').isVisible(), true);
      const 계좌 = await verify('「계좌이체」 라디오가 보인다', await 주문서.결제수단라디오('계좌이체').isVisible(), true);
      const 무통장 = await verify('「무통장입금」 라디오가 보인다', await 주문서.결제수단라디오('무통장입금').isVisible(), true);
      await verify('결제 수단에 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오가 보인다', 카드 && 계좌 && 무통장, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
