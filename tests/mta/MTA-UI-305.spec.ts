import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-305',
  name: '내가 차단한 사람 프로필에 「차단됨」 배지가 보인다',
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

  await test.step('troll_kim 프로필을 연다', async () => {
    await 프로필열기(driver, 'troll_kim');
    await verify('내가 차단한 사람 프로필에 「차단됨」 배지가 보인다', await 문구가보이나(driver, '차단됨'), true);
  }, { capture: true });
});
