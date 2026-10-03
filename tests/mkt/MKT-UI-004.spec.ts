import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-004',
  name: '없는 주소 화면에 「페이지를 찾을 수 없습니다」 문구와 「홈으로」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 없는주소화면(page);

  await test.step('없는 주소를 연다', async () => {
    await 화면.열기();
    await verify('없는 주소 화면에 「페이지를 찾을 수 없습니다」 문구가 보인다', await 화면.제목.isVisible(), true);
    await verify('없는 주소 화면에 「홈으로」 버튼이 보인다', await 화면.홈으로.isVisible(), true);
  });
});
