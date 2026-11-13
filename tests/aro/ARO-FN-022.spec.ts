import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-022',
  name: '「기록」을 처음 열면 「이전」이 비활성이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「기록」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「기록」 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('「기록」을 처음 열면 「이전」이 비활성이다', await 화면.이전.isDisabled(), true);
  });
});
