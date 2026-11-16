import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-114',
  name: '홈 화면에서 오른쪽 아래 글쓰기 버튼을 누르면 「새 게시물」 글쓰기 화면이 열린다',
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
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 오른쪽 아래 글쓰기 버튼을 누른다', async () => {
    await driver.$(홈.글쓰기).click();
    await verify('홈 화면에서 오른쪽 아래 글쓰기 버튼을 누르면 「새 게시물」 글쓰기 화면이 열린다', await 될때까지(driver, async () => (await 보이나(driver, 글쓰기.제목글)) && (await driver.$(글쓰기.제목글).getText()) === '새 게시물', 10_000), true);
  });
});
