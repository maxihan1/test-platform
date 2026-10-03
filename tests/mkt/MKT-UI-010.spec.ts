import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-010',
  name: '없는 주소 화면에 안내 문구 「주소가 바뀌었거나 삭제된 페이지입니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
  unconfirmed: '기획서와 다름 — 차이 D2: 없는 주소 화면에 기획서에 없는 안내 문구가 더 있다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 없는주소화면(page);

  await test.step('없는 주소를 연다', async () => {
    await 화면.열기();
    await verify('없는 주소 화면에 안내 문구 「주소가 바뀌었거나 삭제된 페이지입니다.」가 보인다', await 화면.안내문구.isVisible(), true);
  });
});
