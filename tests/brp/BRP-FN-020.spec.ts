import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-020',
  name: '아이디 칸에서 엔터를 치면 입력 칸이 비밀번호 칸으로 옮겨 간다',
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

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('아이디 칸에 아이디를 넣고 엔터를 친다', async () => {
    await 화면.아이디넣고엔터(아이디);
    await verify('아이디 칸에서 엔터를 치면 입력 칸이 비밀번호 칸으로 옮겨 간다', await 화면.비밀번호칸에있나(), true);
  });
});
