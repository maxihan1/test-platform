import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정추가로그인 } from './helpers/signup-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-538',
  name: '같은 계정을 다시 로그인하면 계정 전환 시트의 계정 줄이 하나로 남는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 계정전환시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('같은 계정으로 「계정 추가」 로그인을 한 번 더 한다', async () => {
    await 계정추가로그인(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 시트.열기();
    await verify('같은 계정을 다시 로그인하면 계정 전환 시트의 계정 줄이 하나로 남는다', (await 시트.사용자명읽기()).length, 1);
  });
});
