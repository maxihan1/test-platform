import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 나타나는가, 넉넉한상품, 상품담기, 시험배송정보, 응답을오류로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-531',
  name: '결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: <상품명>」이 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['일회용 회원으로 로그인해 있다', '주문 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 알림 = new 토스트(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);
  const 풀기 = await 응답을오류로돌리기(page, /\/api\/orders$/, 'POST', 409, { code: 'CONFLICT', message: `재고가 부족한 상품이 있습니다: ${상품.name}` });

  try {
    await test.step('주문 응답을 재고 부족으로 둔 채 결제한다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.최종확인으로넘어가기('계좌이체');
      await verify('「③ 최종 확인」이 보인다', await 주문서.단계글(), '③ 최종 확인', { blocker: true });
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await verify('결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: <상품명>」이 보인다', await 나타나는가(알림.글(`재고가 부족한 상품이 있습니다: ${상품.name}`)), true);
    });
    await test.step('재고 부족 안내 뒤 주문 완료 여부를 확인한다', async () => {
      await verify('재고가 모자라 결제가 막히면 주문 완료 화면으로 가지 않는다', await 완료.제목.isVisible(), false);
    });
  } finally {
    await 풀기();
    await 장바구니비우기(page.request);
  }
});
