import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보이나, 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-008',
  name: '계정이 있으면 앱을 켤 때 마지막으로 쓴 계정의 홈이 바로 나온다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱을 끄고 다시 켠다', async () => {
    await 앱다시켜기(driver);
    const 홈열림 = await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true);
    const 로그인없음 = await verify('시작 화면의 「로그인」 버튼이 보이지 않는다', await 보이나(driver, 시작.로그인), false);
    await verify('계정이 있으면 앱을 켤 때 마지막으로 쓴 계정의 홈이 바로 나온다', 홈열림 && 로그인없음, true);
  }, { capture: true });
});
