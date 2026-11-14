import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-015',
  name: '로그인 후 왼쪽 열에 게시물 작성 상자가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    await verify('로그인 후 왼쪽 열에 게시물 작성 상자가 보인다', await 홈.작성.영역.isVisible(), true);
  });

  await test.step('화면 폭을 좁혀 홈을 연다', async () => {
    await 홈.좁은화면열기();
    await verify('좁은 화면에는 「새 게시물」 버튼이 보인다', await 홈.새게시물버튼.isVisible(), true);
  });
});
