import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-203',
  name: '창의 「닫기」를 누르면 가방 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 가방 창을 열었다'],
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

    await test.step('오른쪽 아래 「닫기」를 누른다', async () => {
      await 가방창.열기(game);
      await verify('가방 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', (await game.layout(가방창.창)).problems, []);
      await game.click(가방창.닫기);
      const 닫힘 = await game.waitFor(가방창.창, { gone: true, timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('창의 「닫기」를 누르면 가방 창이 닫힌다', 닫힘, true);
    });
    await test.step('창 바깥의 어두운 곳을 누른다', async () => {
      await 가방창.열기(game);
      await game.click(가방창.바깥);
      const 닫힘 = await game.waitFor(가방창.창, { gone: true, timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('창 바깥의 어두운 곳을 누르면 가방 창이 닫힌다', 닫힘, true);
    });
    await test.step('메뉴 「가방」을 다시 누른다', async () => {
      await 가방창.열기(game);
      await new 공통HUD(game).메뉴누르기('가방');
      const 닫힘 = await game.waitFor(가방창.창, { gone: true, timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('같은 메뉴 「가방」을 다시 누르면 가방 창이 닫힌다', 닫힘, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
