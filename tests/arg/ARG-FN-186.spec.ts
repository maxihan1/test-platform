import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편받기, 서버가방수량 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-186',
  name: '아이템을 팔면 서버의 가방 기록에서도 그 아이템이 빠진다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 가진 일반 회원이 가방 창을 열었다'],
  elements: ['item:rusty_dagger', 'flow:골드-판매'],
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
      await 우편넣기(admin, 아이디, 'ARG-FN-186', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-186');
      await 가방창.열기(game);
      await 저장될때까지(admin, 아이디, (값) => 서버가방수량(값, '녹슨 단검') === 1);
    });
    await test.step('가방에 「녹슨 단검」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「녹슨 단검」 줄이 있다', (await 가방창.지금(game).목록.이름줄('녹슨 단검')) !== null, true, { blocker: true });
    });
    await test.step('「녹슨 단검」 줄의 「판매」를 누르고 서버 가방 기록을 읽는다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.판매('녹슨 단검');
      const 값 = await 저장될때까지(admin, 아이디, (캐릭터값) => 서버가방수량(캐릭터값, '녹슨 단검') === 0);
      await verify('아이템을 팔면 서버의 가방 기록에서도 그 아이템이 빠진다', 서버가방수량(값, '녹슨 단검'), 0);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
