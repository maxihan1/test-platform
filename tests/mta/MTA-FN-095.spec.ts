import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 시작화면열기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-095',
  name: '서버 웹 화면에서 이메일과 비밀번호로 로그인하고 「승인」을 누르면 앱 홈 화면이 열린다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('서버 웹 화면에서 이메일과 비밀번호로 로그인하고 「승인」을 누른다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('서버 웹 화면에서 이메일과 비밀번호로 로그인하고 「승인」을 누르면 앱 홈 화면이 열린다', await 홈.그려질때까지(), true);
  });
});
