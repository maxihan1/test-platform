import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지 } from './helpers/economy.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-165',
  name: '골드가 0 일 때 구매하려 하면 골드가 음수가 되지 않고 0 그대로다',
  platforms: ['android'],
  precondition: ['골드가 0 인 일반 회원으로 로비에 있다'],
  elements: ['flow:골드-상점구매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 골드를 0 으로 바꾼다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm gold 0');
      await 골드될때까지(game, 0);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('상점에서 「조약돌」 「구매」를 누른다', async () => {
      const 상점 = await 상점창.열기(game);
      await 상점.끌어올리기();
      await 상점.구매('조약돌');
      await 상점.hud.알림기다리기('골드가 부족합니다');
      const 화면 = await verify('상단 바 골드가 0 이다', await 상단바골드(game), 0);
      const 서버 = await verify('서버에 저장된 골드가 0 이다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 0)).골드, 0);
      await verify('골드가 0 일 때 구매하려 하면 골드가 음수가 되지 않고 0 그대로다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
