import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-021',
  name: '비밀번호 칸에서 엔터를 치면 「게임 시작」을 누른 것처럼 로비 화면이 열린다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('아이디와 비밀번호를 넣고 비밀번호 칸에서 엔터를 친다', async () => {
    await 화면.아이디넣기(아이디);
    await 화면.비밀번호넣고엔터(비밀번호);
    await verify('비밀번호 칸에서 엔터를 치면 「게임 시작」을 누른 것처럼 로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true);
  });
});
