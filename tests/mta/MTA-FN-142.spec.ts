import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아래로당기기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-142',
  name: '홈을 당겨서 새로고침하면 새 글을 불러오고 맨 위로 간다',
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
  await test.step('홈을 당겨서 새로고침한다', async () => {
    const 처음 = await 홈.첫글();
    await 아래로당기기(driver);
    const 글있음 = await verify('홈 목록에 글이 보인다', (await 홈.글수()) > 0, true);
    const 맨위 = await verify('목록이 맨 위에 있다', await 홈.맨위글이될때까지(처음), true);
    await verify('홈을 당겨서 새로고침하면 새 글을 불러오고 맨 위로 간다', 글있음 && 맨위, true);
  }, { capture: true });
});
