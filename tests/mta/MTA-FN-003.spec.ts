import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 사라질때까지 } from './helpers/app.helper.js';
import { 모두읽음표시하기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-003',
  name: '「알림」 탭 배지는 안 읽은 알림 수를 보이고 0이면 숨긴다',
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
  await test.step('「알림」 탭에서 「모두 읽은 상태로 표시」를 누르고 홈으로 돌아온다', async () => {
    await 모두읽음표시하기(driver);
    await 홈.탭.누르기('홈');
    const 숨었다 = await 사라질때까지(driver, 홈.탭.알림배지);
    await verify('「알림」 탭 배지는 안 읽은 알림 수를 보이고 0이면 숨긴다', 숨었다, true);
  }, { capture: true });
});
