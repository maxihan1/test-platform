import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 멘션누르기, 프로필제목이뜰때까지 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-471',
  name: '본문 @멘션을 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('minjun_dev 글 본문의 @qa_user1 멘션을 누른다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await 멘션누르기(driver, '@qa_user1');
    await verify('본문 @멘션을 누르면 그 사람 프로필이 열린다', await 프로필제목이뜰때까지(driver, 'qa_user1'), true);
  }, { capture: true });
});
