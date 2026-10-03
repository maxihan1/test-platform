import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-095',
  name: '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
    '상품 상세 화면이다',
    '리뷰 조회 응답은 실패 응답(모킹)이다',
    '리뷰 조회 응답이 처음에는 실패한다(모킹)',
    '다시 시도한 뒤의 리뷰 조회 응답은 가짜 성공 응답(모킹)이다',
  ],
  params: z.object({
    productId: z.number().describe('상품 번호').default(3),
  }),
  expected: z.object({
    requestsBefore: z.number().describe('탭을 누르기 전 리뷰 요청 수').default(0),
    requestsAfter: z.number().describe('탭을 누른 뒤 리뷰 요청 수').default(1),
    retryRequests: z.number().describe('다시 시도까지 리뷰 요청 수').default(2),
  }),
});

type 모드 = '통과' | '계속실패' | '처음만실패';

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);
  let 모드: 모드 = '통과';
  let 요청수 = 0;
  let 모드요청수 = 0;
  page.on('request', (요청) => {
    if (/\/api\/products\/\d+\/reviews/.test(요청.url())) 요청수 += 1;
  });
  const 리뷰응답 = async (route: Route): Promise<void> => {
    모드요청수 += 1;
    if (모드 === '통과') {
      await route.continue();
      return;
    }
    if (모드 === '계속실패' || 모드요청수 === 1) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'UNAVAILABLE', message: '리뷰를 불러오지 못했습니다' }) });
      return;
    }
    const 리뷰 = { author: '시험', rating: 5, content: '가짜 리뷰', createdAt: Date.now() };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [리뷰] }) });
  };
  await page.context().route('**/api/products/*/reviews', 리뷰응답);

  try {
    await test.step('「리뷰」 탭을 처음 누른다', async () => {
      await 상세.열기(params.productId);
      const 누르기전 = 요청수;
      await 상세.리뷰탭.click();
      await 상세.리뷰불러오는중.waitFor({ state: 'detached' });
      await verify('리뷰는 탭을 처음 누를 때 불러온다', { 누르기전, 누른뒤: 요청수 }, { 누르기전: expected.requestsBefore, 누른뒤: expected.requestsAfter });
    });

    await test.step('상품 상세에서 「리뷰」 탭을 누른다', async () => {
      모드 = '계속실패';
      await 상세.열기(params.productId);
      await 상세.리뷰탭.click();
      await 상세.리뷰실패문구.waitFor();
      await verify(
        '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
        { 문구: await 상세.리뷰실패문구.innerText(), 버튼: await 상세.다시시도.isVisible() },
        { 문구: '리뷰를 불러오지 못했습니다', 버튼: true },
      );
    });

    await test.step('「다시 시도」를 누른다', async () => {
      모드 = '처음만실패';
      모드요청수 = 0;
      await 상세.열기(params.productId);
      const 시작 = 요청수;
      await 상세.리뷰탭.click();
      await 상세.리뷰실패문구.waitFor();
      await verify('리뷰 조회 응답이 처음에는 실패한다', await 상세.다시시도.isVisible(), true, { blocker: true });
      await 상세.다시시도.click();
      await 상세.리뷰한건들.first().waitFor();
      await verify(
        '「다시 시도」를 누르면 리뷰를 다시 불러온다',
        { 요청수: 요청수 - 시작, 실패문구: await 상세.리뷰실패문구.count() },
        { 요청수: expected.retryRequests, 실패문구: 0 },
      );
    });
  } finally {
    await page.context().unroute('**/api/products/*/reviews', 리뷰응답);
  }
});
