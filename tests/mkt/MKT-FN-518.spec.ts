import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-518',
  name: '쇼핑 화면을 80px 내려도 머리글이 붙지 않고 높이가 64px 이다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
  techniques: ['경계값 분석'],
  unconfirmed: '기획서와 다름 — 차이 D1: 머리글이 80px 에서는 안 붙고 81px 부터 붙는다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면을 80px 내린다', async () => {
    await 쇼핑.내리기(80);
    await verify(
      '쇼핑 화면을 80px 내려도 머리글이 붙지 않고 높이가 64px 이다',
      { 붙음: await 쇼핑.머리글붙었나(), 높이: await 쇼핑.안정된머리글높이() },
      { 붙음: false, 높이: 64 },
    );
  });
});
