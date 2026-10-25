import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-004',
  name: '로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인 화면이 닫혔는지 확인한다', async () => {
    await verify('로그인 화면이 닫힌다', await 로그인.닫혔나(), true, { blocker: true });
  });

  await test.step('앱을 끄고 다시 켠다', async () => {
    await 다시켜기(driver);
    await verify('로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 보인다', await 로그인.열려있나(), true);
  }, { capture: true });
});
