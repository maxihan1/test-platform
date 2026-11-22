import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비불러오는글잡기 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-489',
  name: '자리를 고르고 「준비!」를 눌러 장면이 바뀌는 동안 불러오는 화면을 읽으면 장면이 바뀔 때 「불러오는 중…」 화면이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('자리를 고르고 「준비!」를 눌러 장면이 바뀌는 동안 불러오는 화면을 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    await 로비.준비누르기();
    const 글 = await 로비불러오는글잡기(game, 던전화면.불러오는화면, 던전화면.불러오는글, 던전화면.안내창, 45_000);
    await verify('자리를 고르고 「준비!」를 눌러 장면이 바뀌는 동안 불러오는 화면을 읽으면 장면이 바뀔 때 「불러오는 중…」 화면이 보인다', 글, '불러오는 중…');
  });
});
