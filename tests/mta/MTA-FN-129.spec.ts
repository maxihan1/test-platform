import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 위로밀기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-129',
  name: '선택된 하단 탭을 다시 누르면 목록 맨 위로 이동한다',
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
  await test.step('홈 목록을 아래로 내린 뒤 「홈」 탭을 다시 누른다', async () => {
    const 처음 = await 홈.첫글();
    await 위로밀기(driver, 4);
    await verify('목록이 아래로 내려가 있다', (await 홈.첫글()) !== 처음, true, { blocker: true });
    await 홈.탭.누르기('홈');
    await verify('선택된 하단 탭을 다시 누르면 목록 맨 위로 이동한다', await 홈.맨위글이될때까지(처음), true);
  }, { capture: true });
});
