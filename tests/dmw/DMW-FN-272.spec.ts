import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 새주문모두취소, 시험배송정보, 장바구니줄읽기, 재고읽기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-272',
  name: '결제하면 주문한 상품이 장바구니에서 빠진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 수량 = 2;
  const 줄 = await 상품담기(page.request, 상품, 수량);
  const 재고전 = await 재고읽기(request, 상품.id);

  try {
    await test.step('장바구니에 담은 상품으로 결제한다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.최종확인으로넘어가기('계좌이체');
      await verify('「③ 최종 확인」이 보인다', await 주문서.단계글(), '③ 최종 확인', { blocker: true });
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 완료.다그려질때까지();
      await verify('결제하면 주문한 상품이 장바구니에서 빠진다', (await 장바구니줄읽기(page.request)).filter((하나) => 하나.productId === 상품.id).length, 0);
    });
    await test.step('결제한 상품의 재고를 확인한다', async () => {
      await verify('결제하면 상품 재고가 주문 수량만큼 줄어든다', await 재고읽기(request, 상품.id), 재고전 - 수량);
    });
  } finally {
    await 새주문모두취소(page.request);
    await 장바구니비우기(page.request);
  }
});
