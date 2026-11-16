import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-112',
  name: '홈 화면에서 상단 설정 아이콘을 누르면 「설정」 화면이 열린다',
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 상단 설정 아이콘을 누른다', async () => {
    await driver.$(홈.설정).click();
    await verify('홈 화면에서 상단 설정 아이콘을 누르면 「설정」 화면이 열린다', await 될때까지(driver, async () => (await 보이나(driver, 설정.제목)) && (await driver.$(설정.제목).getText()) === '설정', 10_000), true);
  });
});
