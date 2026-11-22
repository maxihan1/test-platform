import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-015',
  name: '「게임 시작」을 누르면 접속하는 동안 「게임 시작」 버튼이 눌리지 않는 상태다',
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

  await test.step('「게임 시작」을 누른 바로 뒤 버튼 상태를 읽는다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('「게임 시작」을 누르면 접속하는 동안 「게임 시작」 버튼이 눌리지 않는 상태다', await 화면.게임시작눌리나(), false);
  });
});
