import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-954',
  name: '로그인 화면에서 칸을 비우고 「로그인」을 누르면 로그인되지 않고 로그인 화면에 남는다',
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 칸을 비우고 「로그인」을 누른다', async () => {
    await 로그인.누르기();
    await 로그인.오류안내.waitFor({ timeout: 10_000 });
    const 남음 = await verify('로그인 화면이 그대로 보인다', await 로그인.제목.isVisible(), true);
    const 주소 = await verify('로그인 화면 주소에 남는다', new URL(page.url()).pathname, 로그인화면.주소);
    await verify('로그인 화면에서 칸을 비우고 「로그인」을 누르면 로그인되지 않고 로그인 화면에 남는다', 남음 && 주소, true);
  });
});
