import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-032',
  name: '쇼핑 화면을 79px 내리면 머리글 높이가 64px 그대로다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면을 79px 내린다', async () => {
    await 쇼핑.내리기(79);
    await verify('쇼핑 화면을 79px 내리면 머리글 높이가 64px 그대로다', await 쇼핑.안정된머리글높이(), 64);
  });
});
