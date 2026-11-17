import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 알림없어질때까지, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-141',
  name: '가방에서 「녹슨 단검」을 장착하면 「녹슨 단검 장착」 알림이 뜬다',
  platforms: ['android'],
  smoke: true,
  precondition: ['「녹슨 단검」을 가진 일반 회원이 가방 창을 열었다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 받아 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-141', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-141');
      await 알림없어질때까지(game);
      await 가방창.열기(game);
    });
    await test.step('가방에 「녹슨 단검」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「녹슨 단검」 줄이 있다', (await 가방창.지금(game).목록.이름줄('녹슨 단검')) !== null, true, { blocker: true });
    });
    await test.step('「녹슨 단검」 줄의 「장착」을 누른다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.장착('녹슨 단검');
      const 떴다 = await 가방.hud.알림기다리기('녹슨 단검 장착');
      await verify('가방에서 「녹슨 단검」을 장착하면 「녹슨 단검 장착」 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
