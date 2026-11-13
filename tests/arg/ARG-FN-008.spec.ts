import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지, 접속끝날때까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-008',
  name: '「게임 시작」을 누르면 「서버에 접속하는 중…」이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    접속글: z.string().describe('접속 중 상태 글').default('서버에 접속하는 중'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('상태 줄을 확인한다', async () => {
    const 보였다 = await 로그인화면.지금(game).상태글이될때까지(expected.접속글, 5_000);
    await verify('「게임 시작」을 누르면 「서버에 접속하는 중…」이 보인다', 보였다, true);
    await 접속끝날때까지(game);
  });
});
