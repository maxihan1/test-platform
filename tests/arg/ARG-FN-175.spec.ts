import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지 } from './helpers/economy.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-175',
  name: '골드가 가격보다 1 적은 79 일 때 사려 하면 「골드가 부족합니다」가 뜨고 골드가 79 그대로다',
  platforms: ['android'],
  precondition: ['골드가 79 인 일반 회원이 로비에서 상점 창을 열었다'],
  techniques: ['경계값 분석'],
  elements: ['item:rusty_dagger', 'flow:골드-상점구매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 79 으로 바꿔 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm gold 79');
      await 골드될때까지(game, 79);
      await 상점창.열기(game);
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('골드가 가격보다 1 적을 때 「녹슨 단검」을 산다', async () => {
      const 상점 = 상점창.지금(game);
      await 상점.구매('녹슨 단검');
      const 떴다 = await 상점.hud.알림기다리기('골드가 부족합니다');
      const 알림 = await verify('「골드가 부족합니다」가 뜬다', 떴다, true);
      const 화면 = await verify('상단 바 골드가 79 이다', await 상단바골드(game), 79);
      const 서버 = await verify('서버에 저장된 골드가 79 이다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 79)).골드, 79);
      await verify('골드가 가격보다 1 적은 79 일 때 사려 하면 「골드가 부족합니다」가 뜨고 골드가 79 그대로다', 알림 && 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
