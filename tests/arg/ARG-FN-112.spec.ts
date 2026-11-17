import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-112',
  name: '레벨 1 에서 경험치 400 을 받으면 레벨이 두 번 올라 「Lv.3」과 「18/519」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:3'],
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

    await test.step('레벨 1 에서 GM 명령으로 경험치 400 을 준다', async () => {
      await GM(game, '/gm exp 400');
      const 레벨 = await game.waitFor(공통HUD.레벨이름, { text: 'Lv.3', timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      const 막대 = await game.waitFor(공통HUD.경험치, { text: '18/519', timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      const 레벨보임 = await verify('상단 바에 「Lv.3」이 보인다', 레벨, true);
      const 막대보임 = await verify('경험치 막대에 「18/519」가 보인다', 막대, true);
      await verify('레벨 1 에서 경험치 400 을 받으면 레벨이 두 번 올라 「Lv.3」과 「18/519」가 보인다', 레벨보임 && 막대보임, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
