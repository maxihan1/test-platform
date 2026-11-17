import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-154',
  name: '로비에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 가방 창을 열었다'],
  techniques: ['동등 분할'],
  elements: ['item:health_potion', 'move:물약 로비에서 사용'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 가방창.열기(game);
    });
    await test.step('가방 창을 확인한다', async () => {
      await verify('가방 창이 열려 있다', await 가방창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「체력 물약」 줄의 「사용」을 누른다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.사용('체력 물약');
      const 떴다 = await 가방.hud.알림기다리기('던전에서 살아 있을 때만 쓸 수 있습니다');
      await verify('로비에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
