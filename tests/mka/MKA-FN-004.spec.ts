import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-004',
  name: '로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('앱을 끄고 다시 켠다', async () => {
    await 앱다시켜기(driver);
    await 로그인.제목나올때까지();
    await verify('로그인한 뒤 앱을 끄고 다시 켜면 로그인 화면이 보인다', await 로그인.보이는가(), true);
  });
});
