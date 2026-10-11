import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-283',
  name: '리뷰 조회가 500 UNAVAILABLE 로 실패해도 리뷰 탭에 「다시 시도」 버튼이 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '리뷰 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  const 리뷰주소 = /\/api\/products\/1\/reviews/;

  try {
    await test.step('리뷰 응답을 500 UNAVAILABLE 로 바꾼다', async () => {
      await page.context().route(리뷰주소, async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE' }) });
      });
    });

    await test.step('리뷰 응답을 500 UNAVAILABLE 로 바꾸고 리뷰 탭을 누른다', async () => {
      await 상세.리뷰탭.click();
      await 상세.다시시도.waitFor();
      await verify('리뷰 조회가 500 UNAVAILABLE 로 실패해도 리뷰 탭에 「다시 시도」 버튼이 보인다', await 상세.다시시도.isVisible(), true);
    });
  } finally {
    await page.context().unroute(리뷰주소);
  }
});
