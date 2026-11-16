import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-487',
  name: '일반 회원 홈에 글쓰기 버튼이 보이고 계정 설정에 「필터」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    필터줄: z.string().describe('계정 설정 줄 이름').default('필터'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('일반 회원으로 홈과 설정을 연다', async () => {
    const 글쓰기 = await verify('일반 회원 홈에 글쓰기 버튼이 보인다', await 뜰때까지(driver, 홈.글쓰기, 10_000), true);
    const 열림 = await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true);
    const 필터줄 = await verify('계정 설정에 「필터」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.필터줄), 10_000), true);
    await verify('일반 회원 홈에 글쓰기 버튼이 보이고 계정 설정에 「필터」가 보인다', 글쓰기 && 열림 && 필터줄, true);
  });
});
