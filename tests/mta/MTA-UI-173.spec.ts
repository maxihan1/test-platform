import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-173',
  name: '글쓰기에서 「열람 주의」를 누르면 힌트 「열람 주의」 경고 칸이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    힌트: z.string().describe('경고 칸 힌트').default('열람 주의'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기에서 「열람 주의」를 누른다', async () => {
    const 칸 = await verify('경고 칸이 보인다', await 글쓰기.열람주의열기(), true);
    const 힌트 = await verify('경고 칸 힌트가 기대값과 같다', await 글쓰기.경고글(), expected.힌트);
    await verify('글쓰기에서 「열람 주의」를 누르면 힌트 「열람 주의」 경고 칸이 보인다', 칸 && 힌트, true);
  });
});
