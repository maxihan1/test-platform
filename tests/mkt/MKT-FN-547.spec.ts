import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/common-product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-547',
  name: '리뷰 조회가 500 으로 실패해도 화면에 「다시 시도」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '리뷰 응답은 가짜 응답(모킹)이다 — 500 UNAVAILABLE'],
  params: z.object({}),
  expected: z.object({}),
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 상품 = new 상품상세화면(page);

  try {
    await test.step('리뷰 응답을 500 UNAVAILABLE 로 바꿔 둔다', async () => {
      await page.context().route('**/api/products/*/reviews', (길) =>
        길.fulfill({ status: 500, contentType: 'application/json', json: { code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요' } }),
      );
    });

    await test.step('상품 상세 화면을 연다', async () => {
      await 안내창끄기(page);
      await 상품.열기(1);
      await verify('비회원이다', await 상품.머리글.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('리뷰 조회가 500 UNAVAILABLE 로 실패하는 채 「리뷰」 탭을 누른다', async () => {
      await 상품.리뷰탭.click();
      await 상품.실패문구.waitFor();
      await verify('리뷰 조회가 500 으로 실패해도 화면에 「다시 시도」 버튼이 보인다', await 상품.다시시도버튼.isVisible(), true);
    });
  } finally {
    await page.context().unroute('**/api/products/*/reviews');
  }
});
