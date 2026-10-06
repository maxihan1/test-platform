import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-010',
  name: '쇼핑 화면 바닥글에 「이용약관」 · 「개인정보처리방침」 링크가 보인다',
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
    await verify(
      '쇼핑 화면 바닥글에 「이용약관」 · 「개인정보처리방침」 링크가 보인다',
      (await 쇼핑.바닥글.이용약관링크.isVisible()) && (await 쇼핑.바닥글.개인정보링크.isVisible()),
      true,
    );
    await verify('바닥글에 「© 2026 DemoMarket」 문구가 보인다', await 쇼핑.바닥글.저작권문구.isVisible(), true);
  });
});
