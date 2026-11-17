import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-382',
  name: '200 골드로 「녹슨 단검」과 「가죽 갑옷」을 함께 사면 둘 다 사지고 골드가 20 남는다',
  platforms: ['android'],
  precondition: ['처음 받은 200 골드를 가진 일반 회원이 상점 창을 열었다'],
  elements: ['item:rusty_dagger', 'item:leather_armor', 'flow:골드-상점구매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「녹슨 단검」과 「가죽 갑옷」을 차례로 산다', async () => {
      const 상점 = 상점창.지금(game);
      await 상점.구매('녹슨 단검');
      await 골드될때까지(game, 120);
      await 상점.구매('가죽 갑옷');
      await 골드될때까지(game, 20);
      const 화면 = await verify('상단 바 골드가 20 이다', await 상단바골드(game), 20);
      const 서버 = await verify('서버에 저장된 골드가 20 이다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 20)).골드, 20);
      await 상점.닫기누르기();
      const 가방 = await 가방창.열기(game);
      const 단검 = await verify('가방에 「녹슨 단검」이 있다', (await 가방.목록.이름줄('녹슨 단검')) !== null, true);
      const 갑옷 = await verify('가방에 「가죽 갑옷」이 있다', (await 가방.목록.이름줄('가죽 갑옷')) !== null, true);
      await verify('200 골드로 「녹슨 단검」과 「가죽 갑옷」을 함께 사면 둘 다 사지고 골드가 20 남는다', 화면 && 서버 && 단검 && 갑옷, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
