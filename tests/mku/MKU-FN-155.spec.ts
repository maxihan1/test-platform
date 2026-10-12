import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-155',
  name: '상품 목록 응답이 늦으면 회색 빈 카드 12개가 먼저 보인다',
  precondition: ['상품 목록 응답을 늦춘다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const 목록주소 = /\/api\/products(\?|$)/;
  let 풀기: () => void = () => undefined;

  try {
    await test.step('상품 목록 응답을 붙잡아 둔다', async () => {
      const 대기 = new Promise<void>((끝) => {
        풀기 = 끝;
      });
      await page.context().route(목록주소, async (route) => {
        await 대기;
        await route.continue();
      });
    });

    await test.step('상품 목록을 연다', async () => {
      await 목록.열기();
      await 목록.빈카드들.first().waitFor();
      await verify('상품 목록 응답이 늦으면 회색 빈 카드 12개가 먼저 보인다', await 목록.빈카드들.count(), 12);
    });

    await test.step('늦춘 응답을 보낸다', async () => {
      풀기();
      await 목록.카드들.first().waitFor();
      await verify('상품 목록 응답이 오면 빈 카드가 실제 상품 카드로 바뀐다', (await 목록.빈카드들.count()) === 0 && (await 목록.카드들.count()) > 0, true);
    });
  } finally {
    풀기();
    await page.context().unroute(목록주소);
  }
});
