import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 던전으로 } from './helpers/game-enter.helper.js';
import { 승리결과화면으로 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-477',
  name: '승리와 패배의 결과 화면 조명 색을 읽으면 서로 다르다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
  elements: ['zone:Lobby', 'zone:Dungeon'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('승리 결과 화면과 패배 결과 화면의 조명 색을 읽는다', async () => {
      const 승리 = await 승리결과화면으로(game, 아이디, 비밀번호);
      const 승리색 = JSON.stringify(await 승리.조명색());
      await game.waitFor(로비화면.준비, { timeoutMs: 40_000 });
      await 던전으로(game, 아이디, 비밀번호, 0);
      await GM(game, '/gm faint');
      const 패배 = await 결과화면.열기(game, 40_000);
      const 패배색 = JSON.stringify(await 패배.조명색());
      await verify('승리와 패배의 결과 화면 조명 색을 읽으면 서로 다르다', 승리색 !== 패배색, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
