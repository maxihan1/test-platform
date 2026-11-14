import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-078',
  name: '가입 화면에 「등록하기」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면에 「등록하기」 버튼이 보인다', await 가입.등록하기.isVisible(), true);
    const 암호칸 = await verify('봇 방지 칸 「암호 (채우지 마시오)」는 보이지 않는다', await 가입.봇방지암호칸.isVisible(), false);
    const 사이트칸 = await verify('봇 방지 칸 「Website (채우지 마시오)」는 보이지 않는다', await 가입.봇방지사이트칸.isVisible(), false);
    await verify('봇 방지 칸 「암호 (채우지 마시오)」 · 「Website (채우지 마시오)」는 보이지 않는다', 암호칸 && 사이트칸, true);
  });
});
