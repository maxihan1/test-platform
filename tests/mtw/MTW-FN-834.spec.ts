import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-834',
  name: '리디렉션이 없는 일반 회원 홈을 열면 비활성화 배너가 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await 홈.피드.waitFor();
    await verify('리디렉션이 없는 일반 회원 홈을 열면 비활성화 배너가 없다', await 홈.비활성배너.count(), 0);
  });
});
