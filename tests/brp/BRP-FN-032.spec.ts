import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-032',
  name: '틀린 비밀번호로 「게임 시작」을 누르면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
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

  await test.step('일반 회원 아이디와 틀린 비밀번호로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, '틀린-비밀번호-1');
    await verify('안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('안내 창 제목이 「로그인 실패」다', await 화면.안내.제목(), '로그인 실패');
    const 본문 = await verify('안내 창 본문에 「아이디 또는 비밀번호가 맞지 않습니다」가 들어 있다', (await 화면.안내.본문()).includes('아이디 또는 비밀번호가 맞지 않습니다'), true);
    await verify('틀린 비밀번호로 「게임 시작」을 누르면 「로그인 실패」 창에 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', 제목 && 본문, true);
  });
});
