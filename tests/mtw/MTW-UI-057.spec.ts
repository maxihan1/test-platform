import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-057',
  name: '로그인 화면 하단에 「등록하기」 · 「암호를 잊었나요?」 · 「확인 링크를 못 받았나요?」 링크가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    const 등록 = await verify('「등록하기」 링크가 보인다', await 로그인.등록하기.isVisible(), true);
    const 암호 = await verify('「암호를 잊었나요?」 링크가 보인다', await 로그인.암호잊음.isVisible(), true);
    const 확인 = await verify('「확인 링크를 못 받았나요?」 링크가 보인다', await 로그인.확인링크못받음.isVisible(), true);
    await verify('로그인 화면 하단에 「등록하기」 · 「암호를 잊었나요?」 · 「확인 링크를 못 받았나요?」 링크가 보인다', 등록 && 암호 && 확인, true);
  });
});
