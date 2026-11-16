import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-106',
  name: '홈 화면 상단 제목이 「홈」과 드롭다운으로 보인다',
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 화면을 연다', async () => {
    const 드롭다운 = await verify('상단에 드롭다운이 보인다', await 뜰때까지(driver, 홈.드롭다운, 10_000), true);
    const 제목 = await verify('상단 제목이 「홈」이다', await driver.$(홈.드롭다운글).getText(), '홈');
    await verify('홈 화면 상단 제목이 「홈」과 드롭다운으로 보인다', 드롭다운 && 제목, true);
  });
});
