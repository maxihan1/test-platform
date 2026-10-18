import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 상품상세_다시시도버튼, 상품상세_리뷰탭, 상품상세_제목 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-561',
  name: '리뷰 조회가 500 UNAVAILABLE 이면 화면에 「다시 시도」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['리뷰 응답은 가짜 500 UNAVAILABLE 응답(모킹)이다'],
  params: z.object({
    상품번호: z.number().int().min(1).describe('열어 볼 상품 번호 — 리뷰 탭이 있는 상품').default(2),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, params }) => {
  const 리뷰주소 = /\/api\/products\/\d+\/reviews/;

  try {
    await test.step('리뷰 응답을 가짜 500 UNAVAILABLE 응답으로 바꾼다', async () => {
      await 방해창막기(page);
      await page.context().route(리뷰주소, (경로) =>
        경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE', message: '리뷰를 잠시 불러올 수 없습니다' }) }),
      );
    });

    await test.step('비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
    });

    await test.step('상품 상세 화면을 연다', async () => {
      const 상품 = await 상품정보(page.request, params.상품번호);
      await page.goto(`/shop/${params.상품번호}`);
      await 상품상세_제목(page, 상품.name).waitFor();
      await verify('리뷰 탭이 보인다', await 상품상세_리뷰탭(page).isVisible(), true, { blocker: true });
    });

    await test.step('상품 상세에서 리뷰 탭을 누른다', async () => {
      await 상품상세_리뷰탭(page).click();
      await 상품상세_다시시도버튼(page).waitFor();
      await verify('리뷰 조회가 500 UNAVAILABLE 이면 화면에 「다시 시도」 버튼이 보인다', await 상품상세_다시시도버튼(page).isVisible(), true);
    });
  } finally {
    await page.context().unroute(리뷰주소);
  }
});
