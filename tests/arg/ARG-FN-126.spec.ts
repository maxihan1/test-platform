import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 물약개수가될때까지, 물약개수읽기, 서버아이템개수, 임프하나만두기 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-126',
  name: '임프 전리품이 「체력 물약」으로 나오면 화면 「물약」 버튼 개수가 1 는다',
  platforms: ['android'],
  precondition: ['전리품을 「체력 물약」으로 고정한 일반 회원이 던전에서 임프 하나를 불러냈다'],
  techniques: ['결정 테이블'],
  elements: ['item:health_potion', 'rate:imp_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 물약전 = 0;
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러내 전리품을 「체력 물약」으로 고정한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
      await GM(game, '/gm loot 체력 물약');
      물약전 = await 물약개수읽기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      await verify('임프 전리품이 「체력 물약」으로 나오면 화면 「물약」 버튼 개수가 1 는다', await 물약개수가될때까지(game, 물약전 + 1), 물약전 + 1);
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 서버아이템개수(값.items, '체력 물약') === 물약전 + 1);
      await verify('서버에 저장된 「체력 물약」 개수도 1 는다', 서버아이템개수(서버.items, '체력 물약'), 물약전 + 1);
    });
  } finally {
    await GM(game, '/gm loot off');
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
