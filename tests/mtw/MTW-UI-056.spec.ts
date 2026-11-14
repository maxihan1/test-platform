import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-056',
  name: '로그인 화면에 「이메일 주소」 · 「암호」 칸과 「로그인」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    const 이메일 = await verify('「이메일 주소」 칸이 보인다', await 로그인.이메일칸.isVisible(), true);
    const 암호 = await verify('「암호」 칸이 보인다', await 로그인.암호칸.isVisible(), true);
    const 버튼 = await verify('「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true);
    await verify('로그인 화면에 「이메일 주소」 · 「암호」 칸과 「로그인」 버튼이 보인다', 이메일 && 암호 && 버튼, true);
  });
});
