import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-297',
  name: '로비에서 던전으로 장면이 바뀔 때 「불러오는 중…」 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
  elements: ['zone:Lobby', 'move:장소 로비→던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 탱커 카드를 고른다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      const 로비 = await 로비로(game, 아이디, 비밀번호);
      await 로비.카드누르기(0);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('「준비!」를 누르고 장면이 바뀌는 동안을 지켜본다', async () => {
      await 로비화면.지금(game).준비누르기();
      const 불러오는중 = await game.waitFor(로비화면.불러오는중, { text: '불러오는 중…', timeoutMs: 20_000 }).then(
        () => true,
        () => false,
      );
      await verify('로비에서 던전으로 장면이 바뀔 때 「불러오는 중…」 화면이 보인다', 불러오는중, true);
      await 던전화면.열기(game, 90_000);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
