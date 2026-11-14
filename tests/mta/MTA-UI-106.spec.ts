import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-106',
  name: '홈 상단 제목은 현재 피드 이름과 드롭다운 화살표이고 기본은 「홈」이다',
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
  await test.step('앱에 로그인해 홈을 연다', async () => {
    const 이름 = await verify('홈 상단 제목이 「홈」이다', await 홈.제목글(), '홈');
    const 화살표 = await verify('제목 옆 드롭다운 화살표가 보인다', await 홈.제목이보이나(), true);
    await verify('홈 상단 제목은 현재 피드 이름과 드롭다운 화살표이고 기본은 「홈」이다', 이름 && 화살표, true);
  }, { capture: true });
});
