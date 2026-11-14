import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-073',
  name: '가입 화면 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    const 보임 = await verify('「@mastodon.maxihan.com」이 보인다', await 가입.도메인표시.isVisible(), true);
    const 오른쪽 = await verify('「@mastodon.maxihan.com」이 「사용자명」 칸 오른쪽에 놓인다', await 가입.오른쪽에있는가(), true);
    await verify('가입 화면 「사용자명」 칸 오른쪽에 「@mastodon.maxihan.com」이 보인다', 보임 && 오른쪽, true);
    await verify('「사용자명」 칸 힌트 「문자, 숫자, 밑줄을 사용할 수 있습니다」가 보인다', await 가입.사용자명힌트.isVisible(), true);
  });
});
