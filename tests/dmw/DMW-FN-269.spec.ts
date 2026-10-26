import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 시험배송정보 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-269',
  name: '결제 동의를 체크하면 「<금액>원 결제하기」 버튼이 눌린다',
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
    await test.step('③ 최종 확인에서 동의 체크박스를 켠다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.최종확인으로넘어가기('계좌이체');
      await verify('「③ 최종 확인」이 보인다', await 주문서.단계글(), '③ 최종 확인', { blocker: true });
      await 주문서.동의.check();
      await verify('결제 동의를 체크하면 「<금액>원 결제하기」 버튼이 눌린다', await 주문서.결제하기.isEnabled(), true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
