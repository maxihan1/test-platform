import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-080',
  name: '조작 안내 창에서 「확인」을 누르면 창이 닫힌다',
  platforms: ['windows'],
  precondition: ['던전에 들어와 조작 안내 창이 떠 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('던전에 들어와 조작 안내 창이 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await (await 로비화면.열림(game)).던전들어가기(로비화면.직업자리['탱커']);
    await 던전화면.안내창뜸(game);
    await verify('조작 안내 창이 보인다', (await game.find(던전화면.안내창)) !== null, true, { blocker: true });
  });

  await test.step('조작 안내 창 「확인」을 누른다', async () => {
    await game.click(던전화면.안내확인);
    const 닫혔다 = await game.waitFor(던전화면.안내창, { gone: true, timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('조작 안내 창에서 「확인」을 누르면 창이 닫힌다', 닫혔다, true);
  });
});
