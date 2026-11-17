import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 임프에게맞은피해읽기, 임프하나만두고레벨맞추기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-480',
  name: '던전에 혼자일 때 레벨 1 탱커가 장비 없이 임프에게 맞으면 받은 피해가 8 이다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어가 임프 하나를 불러냈다'],
  elements: ['class:tank', 'monster:imp'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 혼자 던전에 들어가 임프 하나를 불러낸 뒤 레벨을 1 로 맞춘다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두고레벨맞추기(game, 1);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끈 채 임프에게 맞는다', async () => {
      await verify('던전에 혼자일 때 레벨 1 탱커가 장비 없이 임프에게 맞으면 받은 피해가 8 이다', await 임프에게맞은피해읽기(game), 8);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
