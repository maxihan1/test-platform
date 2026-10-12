import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-255',
  name: 'FAQ 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['FAQ 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('FAQ 응답을 500 으로 준 채 고객센터를 연다', async () => {
    const 주소 = /\/api\/faq(\?.*)?$/;
    const 처리 = async (route: Route): Promise<void> => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
    };
    await page.context().route(주소, 처리);
    try {
      const 응답 = page.waitForResponse(주소);
      await 센터.열기();
      await 응답;
      await 센터.제목.waitFor();
      await 센터.패널.getByText(/\S/).first().waitFor();
      await verify('FAQ 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다', await 센터.오류안내.isVisible(), true);
    } finally {
      await page.context().unroute(주소, 처리);
    }
  });
});
