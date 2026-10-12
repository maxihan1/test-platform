import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-192',
  name: '리뷰가 실패한 뒤 「다시 시도」를 누르면 리뷰 목록이 보인다',
  precondition: ['리뷰 응답은 가짜 응답(모킹)이다'],
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
  let 실패시키기 = true;

  try {
    await test.step('리뷰 응답을 실패로 바꾸고 리뷰 탭을 눌러 둔다', async () => {
      await page.context().route(리뷰주소, async (route) => {
        if (실패시키기) await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE' }) });
        else await route.continue();
      });
      await 상세.리뷰탭.click();
    });

    await test.step('리뷰가 실패했는지 확인한다', async () => {
      await 상세.다시시도.waitFor();
      await verify('「다시 시도」 버튼이 보인다', await 상세.다시시도.isVisible(), true, { blocker: true });
    });

    await test.step('리뷰가 실패한 뒤 「다시 시도」를 누른다', async () => {
      실패시키기 = false;
      await 상세.다시시도.click();
      await 상세.리뷰불러오기기다리기();
      await verify('리뷰가 실패한 뒤 「다시 시도」를 누르면 리뷰 목록이 보인다', (await 상세.리뷰글들.count()) > 0, true);
    });
  } finally {
    await page.context().unroute(리뷰주소);
  }
});
