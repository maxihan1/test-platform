import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-040',
  name: '로그인에 실패하면 접속 안내 창이 뜬 채 뒤에 로그인 창 제목 「로그인」이 남아 있다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  techniques: ['동등 분할'],
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

  await test.step('틀린 비밀번호로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, '틀린-비밀번호-1');
    const 떴다 = await verify('접속 안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true);
    const 제목 = await verify('로그인 창 제목이 「로그인」이다', await 화면.제목글(), '로그인');
    await verify('로그인에 실패하면 접속 안내 창이 뜬 채 뒤에 로그인 창 제목 「로그인」이 남아 있다', 떴다 && 제목, true);
  });
});
