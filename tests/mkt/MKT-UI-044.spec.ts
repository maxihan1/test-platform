import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-044',
  name: '로그인 화면을 처음 열면 「로그인」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('로그인 화면을 처음 열면 「로그인」 버튼이 눌리지 않는다', await 화면.로그인버튼.isEnabled(), false);
  });
});
