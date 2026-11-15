import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-589',
  name: '홈을 보는 동안 새 글이 들어오면 위에 「새 게시물」 버튼이 보이고 누르면 맨 위로 간다',
  platforms: ['android'],
  held: '보류 — 홈을 보는 동안 새 글을 올려 줄 다른 기기가 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈을 보는 동안 새 글이 들어온다', async () => {
    const 버튼 = await verify('위에 「새 게시물」 버튼이 보인다', await 뜰때까지(driver, 홈.전체글자포함('새 게시물'), 30_000), true);
    await driver.$(홈.전체글자포함('새 게시물')).click();
    const 맨위 = await verify('맨 위로 간다', await 사라질때까지(driver, 홈.전체글자포함('새 게시물'), 10_000), true);
    await verify('홈을 보는 동안 새 글이 들어오면 위에 「새 게시물」 버튼이 보이고 누르면 맨 위로 간다', 버튼 && 맨위, true);
  });
});
