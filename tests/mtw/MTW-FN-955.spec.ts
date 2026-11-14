import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 수신함확인화면 } from './pages/inbox-check.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-955',
  name: '가입 화면에서 칸을 모두 비우고 「등록하기」를 누르면 가입되지 않고 가입 화면에 남는다',
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);
  const 수신함 = new 수신함확인화면(page);
  let 연시각 = 0;

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    연시각 = await 가입화면열기(page);
    await verify('가입 화면이 열려 있다', await 가입.등록하기.isVisible(), true, { blocker: true });
  });

  await test.step('가입 화면에서 칸을 모두 비우고 「등록하기」를 누른다', async () => {
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르고나간요청수();
    const 남음 = await verify('가입 화면이 그대로 보인다', await 가입.제목.isVisible(), true);
    const 가입안됨 = await verify('「수신함 확인하기」 화면으로 가지 않는다', await 수신함.제목.isVisible(), false);
    await verify('가입 화면에서 칸을 모두 비우고 「등록하기」를 누르면 가입되지 않고 가입 화면에 남는다', 남음 && 가입안됨, true);
  });
});
