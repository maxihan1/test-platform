import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-274',
  name: '가방 창이 열린 채 메뉴 「상점」을 누르면 상점 창이 열린다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 가방창.열기(game);
    });
    await test.step('가방 창이 열렸는지 확인한다', async () => {
      await verify('가방 창이 열려 있다', await 가방창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('메뉴 「상점」을 누른다', async () => {
      await 가방창.지금(game).hud.메뉴누르기('상점');
      const 열림 = await game.waitFor(상점창.제목, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('가방 창이 열린 채 메뉴 「상점」을 누르면 상점 창이 열린다', 열림, true);
      await verify('가방 창은 보이지 않는다', await 가방창.지금(game).열렸나(), false);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
