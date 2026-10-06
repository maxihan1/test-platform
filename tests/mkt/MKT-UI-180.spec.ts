import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-180',
  name: '상담 창 오른쪽 위에 「상담 창 닫기」 X 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '기획서와 다름 — 차이 D27: 상담 창 닫기 X 버튼이 기획서에 없다 (작성 요청 5873)',
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상담 버튼을 눌러 상담 창을 연다', async () => {
    await 쇼핑.상담.열기();
    await verify('상담 창 오른쪽 위에 「상담 창 닫기」 X 버튼이 보인다', [await 쇼핑.상담.닫기X.isVisible(), await 쇼핑.상담.닫기X가창오른쪽위인가()], [true, true]);
  });
});
