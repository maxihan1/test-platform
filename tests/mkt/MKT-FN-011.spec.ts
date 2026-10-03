import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';
import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-011',
  name: '화면을 정확히 80px 내리면 머리글 높이가 64px 그대로다',
  platforms: ['desktop'],
  precondition: ['쇼핑 목록 화면이 열려 있다', '화면을 내리기 전 머리글 높이가 64px 이다'],
  params: z.object({}),
  expected: z.object({}),
  unconfirmed: '기획서와 다름 — 차이 D1: 기획서는 80px 이상이면 머리글이 줄어든다고 하는데 화면은 정확히 80px 에서는 줄지 않고 81px 부터 줄어든다 (작성 요청 5873)',
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

  await test.step('화면을 정확히 80px 내린다', async () => {
    await 홈.내린다(80);
    const 닿음 = await 홈.스크롤이닿을때까지기다린다(80);
    await verify('화면을 정확히 80px 내리면 머리글 높이가 64px 그대로다', [닿음, await 홈.머리글안쪽높이()], [true, 64]);
  });
});
