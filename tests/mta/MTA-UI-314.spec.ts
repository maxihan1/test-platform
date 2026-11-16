import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-314',
  name: '아는 팔로워 줄이 「님이 팔로우함」 꼴로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄끝글: z.string().describe('아는 팔로워 줄의 끝 글').default('님이 팔로우함'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('minjun_dev 프로필의 아는 팔로워 줄을 확인한다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 줄 = await 글읽기(driver, 프로필.아는팔로워);
    await verify('아는 팔로워 줄이 「님이 팔로우함」 꼴로 보인다', 줄.endsWith(expected.줄끝글), true);
  });
});
