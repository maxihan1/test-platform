import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-087',
  name: '게시글 목록 응답이 실패하면 표 자리에 「잠시 후 다시 시도해 주세요」가 보인다',
  precondition: ['비회원이다', '게시글 목록 응답은 가짜 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 막을주소 = /\/api\/posts\?/;
  const 실패로바꾸기 = async (경로: Route): Promise<void> => {
    await 경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
  };
  await 방해막기(page);

  await test.step('게시글 목록 응답을 실패로 바꾸고 게시판 목록을 연다', async () => {
    await page.context().route(막을주소, 실패로바꾸기);
    try {
      await 목록.열기();
      await 목록.표자리.getByText('잠시 후 다시 시도해 주세요').waitFor({ timeout: 5000 });
      await verify('게시글 목록 응답이 실패하면 표 자리에 「잠시 후 다시 시도해 주세요」가 보인다', await 목록.표자리.getByText('잠시 후 다시 시도해 주세요').isVisible(), true);
    } finally {
      await page.context().unroute(막을주소, 실패로바꾸기);
    }
  });
});
