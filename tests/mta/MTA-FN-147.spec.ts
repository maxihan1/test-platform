import { defineCase, test, verify } from '@platform/kit';
import { 글자들, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-147',
  name: '팔로우한 사람이 없는 빈 계정으로 홈을 열면 글이 한 건도 보이지 않는다',
  platforms: ['android'],
  precondition: ['빈 계정으로 로그인해 있다'],
  params: z.object({
    blankId: z.string().describe('빈 계정 아이디').optional().meta({ secret: true, account: '빈 계정' }),
    blankPassword: z.string().describe('빈 계정 비밀번호').optional().meta({ secret: true, account: '빈 계정' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('빈 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.blankId, params.blankPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('팔로우한 사람이 없는 빈 계정으로 홈을 연다', async () => {
    await 홈.열기();
    const 글보임 = await 될때까지(driver, async () => (await 글자들(driver, 홈.첫시간줄)).length > 0, 8_000);
    await verify('팔로우한 사람이 없는 빈 계정으로 홈을 열면 글이 한 건도 보이지 않는다', 글보임, false);
  });
});
