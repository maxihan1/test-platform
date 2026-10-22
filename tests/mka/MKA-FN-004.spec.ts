import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-004',
  name: '로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 다시 보인다',
  platforms: ['android'],
  precondition: ['회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면에서 회원 계정으로 로그인한다', async () => {
    await 화면.제목이보일때까지();
    await 화면.로그인(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 화면이 닫혔는지 확인한다', async () => {
    await verify('로그인 화면이 닫힌다', await 화면.닫힐때까지(), true, { blocker: true });
  });

  await test.step(
    '회원 계정으로 로그인한 뒤 앱을 끄고 다시 켠다',
    async () => {
      await 화면.앱다시켜기();
      await verify('로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 다시 보인다', await 화면.열릴때까지(), true);
    },
    { capture: true },
  );
});
