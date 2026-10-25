import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-177',
  name: '주문서 위쪽에 「① 배송 정보 → ② 결제 수단 → ③ 최종 확인」이 보이고 「① 배송 정보」가 강조된다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 상품, 1);

  try {
    await test.step('장바구니에서 주문서를 연다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 장바구니.주문하기.click();
      await 주문서.다그려질때까지();
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      const 첫째 = await verify('「① 배송 정보」가 보인다', await 주문서.단계항목('① 배송 정보').isVisible(), true);
      const 둘째 = await verify('「② 결제 수단」이 보인다', await 주문서.단계항목('② 결제 수단').isVisible(), true);
      const 셋째 = await verify('「③ 최종 확인」이 보인다', await 주문서.단계항목('③ 최종 확인').isVisible(), true);
      const 강조 = await verify('「① 배송 정보」가 강조된다', await 주문서.단계글(), '① 배송 정보');
      await verify('주문서 위쪽에 「① 배송 정보 → ② 결제 수단 → ③ 최종 확인」이 보이고 「① 배송 정보」가 강조된다', 첫째 && 둘째 && 셋째 && 강조, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
