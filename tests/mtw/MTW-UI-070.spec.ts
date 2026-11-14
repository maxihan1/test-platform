import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입화면열기 } from './helpers/signup.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-070',
  name: '가입 화면 단계 표시줄에 「규정을 수락합니다.」 · 「세부사항」 · 「이메일 확인」이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    const 규정 = await verify('「규정을 수락합니다.」가 보인다', await 가입.단계('규정을 수락합니다.').isVisible(), true);
    const 세부 = await verify('「세부사항」이 보인다', await 가입.단계('세부사항').isVisible(), true);
    const 이메일 = await verify('「이메일 확인」이 보인다', await 가입.단계('이메일 확인').isVisible(), true);
    await verify('가입 화면 단계 표시줄에 「규정을 수락합니다.」 · 「세부사항」 · 「이메일 확인」이 보인다', 규정 && 세부 && 이메일, true);
    await verify('단계 표시줄에 「심사 결과」는 없다', await 가입.단계('심사 결과').isVisible(), false);
  });
});
