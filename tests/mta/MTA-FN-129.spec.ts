import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 첫줄앞부분 } from './helpers/timeline.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-129',
  name: '홈 목록을 내린 뒤 하단 「홈」 탭을 다시 누르면 목록 맨 위 글이 다시 보인다',
  platforms: ['android'],
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

  await test.step('홈 목록을 내린 뒤 하단 「홈」 탭을 다시 누른다', async () => {
    const 맨위글 = 첫줄앞부분(await 홈.첫글본문());
    await 홈.아래로밀기();
    await verify('맨 위 글이 화면 밖으로 밀려 있다', await 사라질때까지(driver, 홈.목록글자포함(맨위글), 5_000), true, { blocker: true });
    await driver.$(홈.탭.홈).click();
    await verify('홈 목록을 내린 뒤 하단 「홈」 탭을 다시 누르면 목록 맨 위 글이 다시 보인다', await 뜰때까지(driver, 홈.목록글자포함(맨위글), 10_000), true);
  });
});
