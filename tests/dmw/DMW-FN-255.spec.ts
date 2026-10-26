import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 오늘부터 } from './helpers/common-tools.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-255',
  name: '배송 희망일 날짜 선택기는 오늘로부터 2일 뒤부터 14일 뒤까지만 고를 수 있다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
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
    await test.step('배송 희망일 날짜 칸의 고를 수 있는 범위를 확인한다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await verify('배송 희망일 날짜 선택기는 오늘로부터 2일 뒤부터 14일 뒤까지만 고를 수 있다', await 주문서.희망일범위(), `${오늘부터(2)} ~ ${오늘부터(14)}`);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
