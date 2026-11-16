import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 계정줄 } from './helpers/app.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-124',
  name: '글 상세에서 글쓴이 아바타를 누르면 그 사람 프로필이 열린다',
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
  const 프로필 = new 프로필화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글 상세에서 글쓴이 아바타를 누른다', async () => {
    await 글상세열기(driver, 'minjun_dev', '마스토돈 4.7 인용 기능');
    await driver.$(글상세.글쓴이아바타('minjun_dev')).click();
    await verify('글 상세에서 글쓴이 아바타를 누르면 그 사람 프로필이 열린다', await 될때까지(driver, async () => (await 보이나(driver, 프로필.계정)) && (await driver.$(프로필.계정).getText()) === 계정줄('minjun_dev'), 15_000), true);
  });
});
