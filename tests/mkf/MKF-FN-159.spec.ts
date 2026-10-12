import { defineCase, test, verify } from '@platform/kit';

import { 리뷰있는상품 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-159',
  name: '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
  techniques: ['동등 분할'],
  precondition: ['리뷰 응답은 서버 오류 500 가짜 응답(모킹)이다', '리뷰 응답은 첫 번만 서버 오류 500 인 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  const 상품 = await 리뷰있는상품(page.request);

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(상품.id);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  const 리뷰주소 = new RegExp('/api/products/' + String(상품.id) + '/reviews');
  let 첫요청 = true;

  try {
    await test.step('리뷰 응답을 첫 번만 실패로 바꾼다', async () => {
      await page.context().route(리뷰주소, async (route) => {
        if (첫요청) {
          첫요청 = false;
          await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE' }) });
          return;
        }
        await route.continue();
      });
    });

    await test.step('「리뷰」 탭을 누른다', async () => {
      await 상세.리뷰탭.click();
      await 상세.다시시도.waitFor();
      await verify('리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다', [await 상세.리뷰실패문구.isVisible(), await 상세.다시시도.isVisible()], [true, true]);
    });

    await test.step('「다시 시도」를 누른다', async () => {
      await verify('「다시 시도」 버튼이 보인다', await 상세.다시시도.isVisible(), true, { blocker: true });
      await 상세.다시시도.click();
      await 상세.리뷰불러오기기다리기();
      await verify('「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰가 보인다', (await 상세.리뷰글들.count()) > 0, true);
    });
  } finally {
    await page.context().unroute(리뷰주소);
  }
});
