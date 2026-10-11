import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-148',
  name: '상품 목록 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['비회원이다', '상품 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 토스 = new 토스트(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const 목록주소 = /\/api\/products(\?|$)/;

  try {
    await test.step('상품 목록 응답을 실패로 바꾼다', async () => {
      await page.context().route(목록주소, async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
      });
    });

    await test.step('상품 목록 응답을 실패로 바꾸고 상품 목록을 연다', async () => {
      await 목록.열기();
      await 토스.알림들.first().waitFor();
      await verify('상품 목록 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다', await 토스.글('잠시 후 다시 시도해 주세요').first().isVisible(), true);
    });
  } finally {
    await page.context().unroute(목록주소);
  }
});
