import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-323',
  name: '상점 목록을 끌어 올리면 마지막 상품 「조약돌」 줄이 화면 안에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 상점 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('상점 목록을 위로 끌어 올린다', async () => {
      const 상점 = 상점창.지금(game);
      await 상점.끌어올리기();
      await verify('상점 목록을 끌어 올리면 마지막 상품 「조약돌」 줄이 화면 안에 보인다', await 상점.줄밖('조약돌'), []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
