import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-421',
  name: '묶음 줄의 「판매」를 누르면 1개만 팔려 「체력 물약 x2」가 된다',
  platforms: ['android'],
  precondition: ['「체력 물약」 3개를 가진 일반 회원이 가방 창을 열었다'],
  elements: ['item:health_potion'],
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
      await verify('가방에 「체력 물약 x3」 줄이 있다', await 가방창.지금(game).줄칸글('체력 물약', 0), '체력 물약 x3', { blocker: true });
    });
    await test.step('「체력 물약 x3」 줄의 「판매」를 누른다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.판매('체력 물약');
      await 조건될때까지(async () => (await 가방.줄칸글('체력 물약', 0)) !== '체력 물약 x3');
      await verify('묶음 줄의 「판매」를 누르면 1개만 팔려 「체력 물약 x2」가 된다', await 가방.줄칸글('체력 물약', 0), '체력 물약 x2');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
