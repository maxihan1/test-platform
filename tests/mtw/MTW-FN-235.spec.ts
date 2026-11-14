import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 수신함확인화면 } from './pages/inbox-check.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-235',
  name: '필수 칸을 채우고 동의한 뒤 「등록하기」를 누르면 「수신함 확인하기」 화면으로 간다',
  smoke: true,
  precondition: ['비회원이다'],
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

  await test.step('가입 화면에 tc_signup 으로 시작하는 사용자명 · 이메일 · 암호를 넣고 동의한 뒤 「등록하기」를 누른다', async () => {
    await 가입.채우기(새계정값());
    await 가입.동의하기();
    await 연지3초지날때까지(page, 연시각);
    await 가입.누르기();
    const 떴다 = await 수신함.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 화면 = await verify('「수신함 확인하기」 제목이 보인다', 떴다, true);
    const 주소 = await verify('수신함 확인 화면 주소로 간다', new URL(page.url()).pathname, 수신함확인화면.주소);
    await verify('필수 칸을 채우고 동의한 뒤 「등록하기」를 누르면 「수신함 확인하기」 화면으로 간다', 화면 && 주소, true);
  });
});
