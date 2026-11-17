import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 머리위숫자읽기, 임프하나만두기 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-109',
  name: '적이 피해를 받으면 머리 위 피해 숫자가 흰색이다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에서 임프 하나를 불러냈다', '일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['monster:imp'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('임프를 공격한다', async () => {
      await 던전화면.지금(game).누르기(던전화면.임프);
      const 숫자 = await 머리위숫자읽기(game, 던전화면.적피해숫자);
      await verify('적이 피해를 받으면 머리 위 피해 숫자가 흰색이다', 숫자?.색 ?? '', '흰색');
    });

    await test.step('무적을 끄고 임프에게 맞는다', async () => {
      const 숫자 = await 머리위숫자읽기(game, 던전화면.내피해숫자, 20_000);
      await verify('내가 받은 피해 숫자는 빨간색이다', 숫자?.색 ?? '', '빨간색');
    });

    await test.step('체력을 줄이고 「물약」을 누른다', async () => {
      await GM(game, '/gm killall');
      await GM(game, '/gm hp 600');
      await 던전화면.지금(game).물약누르기();
      const 숫자 = await 머리위숫자읽기(game, 던전화면.회복숫자);
      const 초록 = await verify('회복 숫자가 초록색이다', 숫자?.색 ?? '', '초록색');
      const 더하기 = await verify('회복 숫자가 「+」로 시작한다', 숫자?.글.startsWith('+') ?? false, true);
      await verify('회복 숫자는 초록색 「+」로 시작한다', 초록 && 더하기, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
