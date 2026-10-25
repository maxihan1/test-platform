import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-031',
  name: 'server 값 없이 켠 앱으로 로그인하면 로그인 화면이 닫힌다',
  platforms: ['android'],
  smoke: true,
  precondition: ['일반 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('server 값 없이 켠 앱에서 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
    await verify('server 값 없이 켠 앱으로 로그인하면 로그인 화면이 닫힌다', await 로그인.닫혔나(), true);
  }, { capture: true });
});
