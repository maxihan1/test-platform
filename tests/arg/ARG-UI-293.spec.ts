import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-293',
  name: '로비에서 메뉴 「친구」를 누르면 친구 · 파티 창이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('메뉴 「친구」를 누른다', async () => {
      await new 공통HUD(game).메뉴누르기('친구');
      const 열림 = await game.waitFor(친구파티창.창, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('로비에서 메뉴 「친구」를 누르면 친구 · 파티 창이 열린다', 열림, true);
      await verify('친구 · 파티 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', (await game.layout(친구파티창.창)).problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
