import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 지금화면 } from './helpers/login.helper.js';
import { 앱데이터지우고켜기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-476',
  name: '앱 데이터를 지운 뒤 앱을 켜면 다시 로그인해야 하는 시작 화면이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('로그인한 앱의 데이터를 지우고 다시 켠다', async () => {
    await 앱데이터지우고켜기(driver);
    await verify('앱 데이터를 지운 뒤 앱을 켜면 다시 로그인해야 하는 시작 화면이 보인다', await 지금화면(driver), '시작');
  });
});
