import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기, 지금화면 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-487',
  name: '로그아웃 창에서 「로그아웃」을 누르면 계정이 지워지고 시작 화면이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('로그아웃 창에서 「로그아웃」을 누른다', async () => {
    await 설정.줄누르기('로그아웃');
    await verify('로그아웃 확인 창이 뜬다', await 창.뜰때까지(), true, { blocker: true });
    await 창.확인();
    await verify('로그아웃 창에서 「로그아웃」을 누르면 계정이 지워지고 시작 화면이 보인다', await 지금화면(driver), '시작');
  });
});
