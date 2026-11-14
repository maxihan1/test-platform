import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-255',
  name: '가입 화면을 연 뒤 3초 안에 「등록하기」를 누르면 「너무 빠르게 양식이 제출되었습니다, 다시 시도하세요.」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면을 연 직후 3초 안에 칸을 채워 「등록하기」를 누른다', async () => {
    await 가입.빠르게채우기(새계정값());
    await 가입.동의하기();
    await 가입.누르기();
    const 떴다 = await 가입.안내('너무 빠르게 양식이 제출되었습니다, 다시 시도하세요.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('가입 화면을 연 뒤 3초 안에 「등록하기」를 누르면 「너무 빠르게 양식이 제출되었습니다, 다시 시도하세요.」가 보인다', 떴다, true);
  });
});
