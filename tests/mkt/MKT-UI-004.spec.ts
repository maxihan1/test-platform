import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-004',
  name: '비회원 머리글의 장바구니 아이콘 옆에 숫자 배지가 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('비회원 머리글의 장바구니 아이콘 옆에 숫자 배지가 보이지 않는다', await 쇼핑.머리글.장바구니배지.isVisible(), false);
  });
});
