import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-074',
  name: '가입 화면에 「이메일 주소」 · 「암호」 · 「암호 다시 입력」 칸이 필수로 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    const 이메일 = await verify('「이메일 주소」 칸이 필수로 보인다', await 가입.필수인가(가입.이메일칸), true);
    const 암호 = await verify('「암호」 칸이 필수로 보인다', await 가입.필수인가(가입.암호칸), true);
    const 확인 = await verify('「암호 다시 입력」 칸이 필수로 보인다', await 가입.필수인가(가입.암호확인칸), true);
    await verify('가입 화면에 「이메일 주소」 · 「암호」 · 「암호 다시 입력」 칸이 필수로 보인다', 이메일 && 암호 && 확인, true);
  });
});
