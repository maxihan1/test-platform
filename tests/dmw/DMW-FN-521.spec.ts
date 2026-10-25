import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주소검색창화면 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-521',
  name: '주소 검색 새 창에서 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    한자: z.string().describe('주소 검색어 — 1자').default('가'),
    두자: z.string().describe('주소 검색어 — 결과가 나오는 2자').default('테헤'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);

  let 팝업: 주소검색창화면;

  try {
    await test.step('주소 검색 새 창에서 1자로 검색한다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      팝업 = new 주소검색창화면(await 주문서.주소검색창열기());
      await 팝업.다그려질때까지();
      await 팝업.검색(params.한자);
      await verify('주소 검색 새 창에서 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다', await 팝업.안내('검색어를 2자 이상 입력하세요').isVisible(), true);
    });
    await test.step('주소 검색 새 창에서 2자로 검색한다', async () => {
      await 팝업.검색(params.두자);
      await 팝업.결과나올때까지();
      await verify('주소 검색 새 창에서 2자로 검색하면 검색어 안내 없이 결과가 보인다', await 팝업.안내('검색어를 2자 이상 입력하세요').isVisible(), false);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
