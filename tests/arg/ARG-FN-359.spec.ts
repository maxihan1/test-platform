import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-359',
  name: '「행운의 반지」를 끼고 「체력 물약」을 팔면 골드 획득 효과 없이 7 골드를 받는다',
  platforms: ['android'],
  precondition: ['「행운의 반지」를 낀 일반 회원으로 로비에 있다'],
  elements: ['item:lucky_ring', 'item:health_potion', 'flow:골드-판매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「행운의 반지」를 끼고 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-359', [{ 이름: '행운의 반지', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-359');
      await 가방에서장착(game, '행운의 반지');
      await 가방창.열기(game);
    });
    await test.step('가방에 「체력 물약」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「체력 물약」 줄이 있다', (await 가방창.지금(game).목록.이름줄('체력 물약')) !== null, true, { blocker: true });
    });
    await test.step('「체력 물약」 하나를 판다', async () => {
      const 가방 = 가방창.지금(game);
      const 전 = await 상단바골드(game);
      await 가방.판매('체력 물약');
      await 골드될때까지(game, 전 + 7);
      const 화면 = await verify('상단 바 골드가 7 오른다', (await 상단바골드(game)) - 전, 7);
      const 서버 = await verify('서버에 저장된 골드가 7 오른다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 + 7)).골드 - 전, 7);
      await verify('「행운의 반지」를 끼고 「체력 물약」을 팔면 골드 획득 효과 없이 7 골드를 받는다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
