import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-172',
  name: '맞는 이메일과 암호로 로그인하면 홈으로 간다',
  smoke: true,
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 일반 회원의 이메일과 암호를 넣고 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 홈.그려질때까지();
    await verify('맞는 이메일과 암호로 로그인하면 홈으로 간다', new URL(page.url()).pathname, '/home');
  });
});
