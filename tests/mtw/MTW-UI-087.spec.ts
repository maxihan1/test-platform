import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-087',
  name: '가입 화면에 가입 사유 칸과 생년월일 칸이 없다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    const 사유 = await verify('가입 사유 칸이 보이지 않는다', await 가입.가입사유칸.isVisible(), false);
    const 생일 = await verify('생년월일 칸이 보이지 않는다', await 가입.생년월일칸.isVisible(), false);
    await verify('가입 화면에 가입 사유 칸과 생년월일 칸이 없다', 사유 && 생일, true);
  });
});
