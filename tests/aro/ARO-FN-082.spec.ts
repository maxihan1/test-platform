import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-082',
  name: '로그인 상태에서 「/nope」 주소를 열면 서버가 404 를 돌려준다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('「/nope」 주소를 연다', async () => {
    const 응답 = await page.request.get('/nope');
    await verify('로그인 상태에서 「/nope」 주소를 열면 서버가 404 를 돌려준다', 응답.status(), 404);
  });
});
