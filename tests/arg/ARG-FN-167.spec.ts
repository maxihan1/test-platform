import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 골드될때까지 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-167',
  name: '「구매」를 한 번 누르면 확인 창 없이 가방에 「조약돌」 1개가 들어온다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「조약돌」 줄의 「구매」를 한 번 누른다', async () => {
      const 상점 = 상점창.지금(game);
      const 전 = await 상단바골드(game);
      await 상점.끌어올리기();
      await 상점.구매('조약돌');
      const 바로 = await verify('확인 창 없이 골드가 3 줄어든다', await 골드될때까지(game, 전 - 3), true);
      await 상점.닫기누르기();
      const 가방 = await 가방창.열기(game);
      const 들어옴 = await verify('가방에 「조약돌」 1개가 들어온다', await 가방.줄칸글('조약돌', 0), '조약돌');
      await verify('「구매」를 한 번 누르면 확인 창 없이 가방에 「조약돌」 1개가 들어온다', 바로 && 들어옴, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
