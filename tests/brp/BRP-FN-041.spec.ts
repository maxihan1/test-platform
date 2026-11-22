import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창버튼글, 안내창버튼이하나인가 } from './helpers/screen-check.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-041',
  name: '접속이 거절되면 화면 가운데 안내 창에 버튼이 「확인」 하나만 보인다',
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

  await test.step('틀린 비밀번호로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, '틀린-비밀번호-1');
    await verify('접속 안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    const 하나 = await verify('안내 창에 버튼이 하나만 있다', await 안내창버튼이하나인가(game), true);
    const 확인 = await verify('안내 창 버튼 글이 「확인」이다', await 안내창버튼글(game), '확인');
    await verify('접속이 거절되면 화면 가운데 안내 창에 버튼이 「확인」 하나만 보인다', 하나 && 확인, true);
  });
});
