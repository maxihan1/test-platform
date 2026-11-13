import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-443',
  name: '비밀번호 칸을 비우고 「게임 시작」을 누르면 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내글: z.string().describe('창 아래 안내 글').default('아이디와 비밀번호를 입력해 주세요'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('비밀번호 칸을 비우고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(params.loginId ?? '');
    await 화면.비밀번호넣기('');
    await 화면.게임시작누르기();
  });

  await test.step('창 아래 안내 글을 확인한다', async () => {
    const 떴다 = await 로그인화면.지금(game).상태글이될때까지(expected.안내글, 10_000);
    await verify('비밀번호 칸을 비우고 「게임 시작」을 누르면 창 아래에 「아이디와 비밀번호를 입력해 주세요」가 보인다', 떴다, true);
  });
});
