import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-018',
  name: '틀린 비밀번호로 접속에 실패하면 「게임 시작」 버튼이 다시 눌리는 상태가 된다',
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

  await test.step('틀린 비밀번호로 「게임 시작」을 누르고 안내 창 「확인」을 누른다', async () => {
    await 화면.넣고시작(아이디, '틀린-비밀번호-1');
    await verify('접속 실패 안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    await 화면.안내.확인누르기();
    await verify('틀린 비밀번호로 접속에 실패하면 「게임 시작」 버튼이 다시 눌리는 상태가 된다', await 화면.게임시작눌릴때까지(), true);
  });
});
