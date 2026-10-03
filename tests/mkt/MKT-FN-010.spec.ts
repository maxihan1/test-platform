import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';
import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-010',
  name: '페이지를 80px 이상 내리면 머리글이 위에 붙고 높이가 64px 에서 48px 로 줄어든다',
  platforms: ['desktop'],
  precondition: ['쇼핑 목록 화면이 열려 있다', '화면을 내리기 전 머리글 높이가 64px 이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 목록 = new 상품목록(page);

  await test.step('쇼핑 목록 화면을 연다', async () => {
    await 홈.쿠키띠를치운다();
    await 목록.열고기다린다();
    await verify('쇼핑 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('화면을 내리기 전 머리글 높이가 64px 이다', await 홈.머리글안쪽높이(), 64, { blocker: true });
  });

  await test.step('화면을 200px 내린다', async () => {
    await 홈.내린다(200);
    const 줄어듦 = await 홈.머리글안쪽높이가될때까지기다린다(48);
    await verify('페이지를 80px 이상 내리면 머리글이 화면 위에 붙어 따라 내려온다', [await 홈.스크롤위치(), await 홈.머리글위쪽()], [200, 0]);
    await verify('페이지를 80px 이상 내리면 머리글 높이가 64px 에서 48px 로 줄어든다', [줄어듦, await 홈.머리글안쪽높이()], [true, 48]);
  });
});
