import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-313',
  name: '올해 가입한 계정 프로필의 「가입」 날짜가 「월 일」 꼴로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    날짜꼴: z.string().describe('가입 날짜의 정규식 — 월 일 꼴').default('^\\d{1,2}월 \\d{1,2}일$'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('올해 가입한 minjun_dev 프로필을 연다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 날짜 = await 글읽기(driver, 프로필.가입일);
    await verify('올해 가입한 계정 프로필의 「가입」 날짜가 「월 일」 꼴로 보인다', new RegExp(expected.날짜꼴).test(날짜), true);
  });
});
