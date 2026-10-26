import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주소검색창화면 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-252',
  name: '주소 검색 결과를 고르면 새 창이 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 2자 이상 도로명').default('테헤란'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);

  let 고른글 = '';

  try {
    await test.step('주소 검색 새 창에서 「테헤란」을 검색하고 결과를 고른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      const 팝업 = new 주소검색창화면(await 주문서.주소검색창열기());
      await 팝업.다그려질때까지();
      await 팝업.검색(params.주소검색어);
      await 팝업.결과나올때까지();
      고른글 = await 팝업.첫결과글();
      await 팝업.결과고르기();
      await verify('주소 검색 결과를 고르면 새 창이 닫힌다', await 팝업.닫혔는가(), true);
    });
    await test.step('결과를 고른 뒤 주문서 주소 칸을 확인한다', async () => {
      await 주문서.주소가채워질때까지();
      const 우편 = await verify('주문서의 우편번호 칸이 고른 결과의 우편번호다', await 주문서.우편번호값(), 고른글.slice(0, 5));
      const 주소 = await verify('주문서의 주소 칸이 고른 결과의 주소다', await 주문서.주소값(), 고른글.slice(5));
      await verify('주소 검색 결과를 고르면 주문서의 우편번호 · 주소 칸이 채워진다', 우편 && 주소, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
