import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱주소열기 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-586',
  name: 'code 없이 돌아오거나 진행 중이던 인증 정보가 없으면 아무 화면 없이 창을 닫는다',
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
  await test.step('앱에 code 없는 org.joinmastodon.android-auth://callback 주소를 연다', async () => {
    await 앱주소열기(driver, 'org.joinmastodon.android-auth://callback');
    await verify('code 없이 돌아오거나 진행 중이던 인증 정보가 없으면 아무 화면 없이 창을 닫는다', await 홈.떴나(10_000), true);
  }, { capture: true });
});
