import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-013',
  name: '일반 회원 아이디로 로그인을 시도한 뒤 게임을 껐다 켜면 아이디 칸에 그 아이디가 미리 차 있다',
  platforms: ['windows'],
  precondition: ['일반 회원 아이디로 로그인을 한 번 시도했다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  await test.step('일반 회원 아이디로 로그인을 한 번 시도한다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('로그인 시도가 끝나 로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true, { blocker: true });
  });

  await test.step('게임을 껐다 켠다', async () => {
    await game.restart();
    const 화면 = await 로그인화면.열림(game);
    await verify('일반 회원 아이디로 로그인을 시도한 뒤 게임을 껐다 켜면 아이디 칸에 그 아이디가 미리 차 있다', await 화면.아이디칸글(), 아이디);
  });
});
