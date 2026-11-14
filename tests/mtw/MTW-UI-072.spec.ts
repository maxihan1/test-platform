import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-072',
  name: '가입 화면에 제목 「mastodon.maxihan.com에 가입하기 위한 정보들을 입력하세요.」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면에 제목 「mastodon.maxihan.com에 가입하기 위한 정보들을 입력하세요.」가 보인다', await 가입.제목.isVisible(), true);
  });
});
