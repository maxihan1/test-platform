import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 오늘부터 } from './helpers/common-tools.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 범위안의일요일뒤, 상품담기, 시험배송정보 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-257',
  name: '배송 희망일에 일요일을 고르면 「일요일은 배송하지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['결정 테이블'],
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
    await test.step('배송 희망일에 범위 안의 일요일을 고르고 「다음」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송정보채우기({ ...시험배송정보(오늘부터(범위안의일요일뒤())) });
      await 주문서.다음.click();
      await verify('배송 희망일에 일요일을 고르면 「일요일은 배송하지 않습니다」가 보인다', await 주문서.안내('일요일은 배송하지 않습니다').isVisible(), true);
    });
    await test.step('일요일을 고른 뒤 단계를 확인한다', async () => {
      await verify('배송 희망일에 일요일을 고르면 「② 결제 수단」으로 넘어가지 않는다', await 주문서.단계글(), '① 배송 정보');
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
