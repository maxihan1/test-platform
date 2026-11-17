import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-296',
  name: '던전에 들어가면 초상화 · 행동 막대가 있는 던전 HUD 가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
  elements: ['zone:Dungeon', 'move:장소 로비→던전'],
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

    await test.step('「준비!」를 눌러 던전에 들어간다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
      const 던전 = 던전화면.지금(game);
      const 초상화 = await verify('던전에 내 초상화가 보인다', await 던전.보이나(던전화면.내초상화), true);
      const 행동막대 = await verify('던전에 행동 막대가 보인다', await 던전.보이나(던전화면.행동막대), true);
      await verify('던전에 들어가면 초상화 · 행동 막대가 있는 던전 HUD 가 보인다', 초상화 && 행동막대, true);
      const 배치 = await game.layout(던전화면.행동막대);
      await verify('행동 막대의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
