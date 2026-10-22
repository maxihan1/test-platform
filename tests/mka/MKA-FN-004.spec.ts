import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-004',
  name: '로그인한 뒤 앱을 껐다가 다시 켜면 로그인 화면의 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인.로그인버튼보일때까지();
    await 로그인.로그인(계정.loginId, 계정.password);
  });

  await test.step('로그인 화면이 사라졌는지 확인한다', async () => {
    await verify('로그인 화면이 사라진다', await 로그인.로그인화면사라질때까지(), true, { blocker: true });
  });

  await test.step('로그인한 뒤 앱을 껐다가 다시 켠다', async () => {
    await 로그인.앱다시켜기();
    await verify('로그인한 뒤 앱을 껐다가 다시 켜면 로그인 화면의 「로그인」 버튼이 보인다', await 로그인.로그인버튼보일때까지(), true);
  }, { capture: true });
});
