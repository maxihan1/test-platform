import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주소검색창화면 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-185',
  name: '「주소 검색」을 누르면 새 창으로 주소 검색 화면이 열린다',
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
    await test.step('주문서에서 「주소 검색」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      const 팝업 = new 주소검색창화면(await 주문서.주소검색창열기());
      await 팝업.다그려질때까지();
      const 화면 = await verify('주소 검색 화면이 보인다', await 팝업.제목.isVisible(), true);
      const 주소 = await verify('새 창의 주소가 주소 검색 화면이다', await 팝업.주소(), '/popup/address');
      await verify('「주소 검색」을 누르면 새 창으로 주소 검색 화면이 열린다', 화면 && 주소, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
