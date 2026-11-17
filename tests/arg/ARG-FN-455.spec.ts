import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 머리위숫자글, 수치, 임프하나만두고레벨맞추기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-455',
  name: '받는 피해가 1 아래로 계산되면 피해가 1 이다',
  platforms: ['android'],
  held: '보류 — 받는 피해가 1 아래로 계산되는 상황을 만드는 길이 없다',
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  techniques: ['경계값 분석'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에 들어가 임프 하나를 불러내 레벨을 30 으로 바꾼다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두고레벨맞추기(game, 30);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('받는 피해가 1 아래가 되는 상황에서 맞는다', async () => {
      await 머리위숫자글(game, 던전화면.내피해숫자, 20_000);
      const 상태 = await 상태읽기(game, true);
      await verify('받는 피해가 1 아래로 계산되면 피해가 1 이다', 수치(상태, '받은피해') >= 1, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
