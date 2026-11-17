import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 자리가맞나 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-278',
  name: '알림이 뜨면 화면 위쪽 가운데에 한 줄로 2초 뒤에도 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 상점 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창이 열렸는지 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });

    await test.step('「조약돌」을 사고 알림을 지켜본다', async () => {
      await 상점창.지금(game).구매('조약돌');
      await verify('알림이 뜬다', await game.waitFor(공통HUD.알림들, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      ), true, { blocker: true });
      const 처음 = Date.now();
      const 위치 = await verify('알림이 화면 위쪽 가운데에 있다', await 자리가맞나(game, 공통HUD.알림들, '가운데', '위'), true);
      const 한줄 = await verify('알림이 한 줄이다', (await game.text(공통HUD.알림들)).trim().includes('\n'), false);
      const 남음 = await verify(
        '알림이 2초 뒤에도 보인다',
        await game.waitFor(공통HUD.알림들, { gone: true, timeoutMs: 2_000 }).then(
          () => false,
          () => true,
        ),
        true,
      );
      await verify('알림이 뜨면 화면 위쪽 가운데에 한 줄로 2초 뒤에도 보인다', 위치 && 한줄 && 남음, true);
      const 사라짐 = await game.waitFor(공통HUD.알림들, { gone: true, timeoutMs: Math.max(500, 4_000 - (Date.now() - 처음)) }).then(
        () => true,
        () => false,
      );
      await verify('알림은 뜬 뒤 4초 안에 사라진다', 사라짐, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
