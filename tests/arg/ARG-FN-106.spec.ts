import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 머리위숫자글, 머리위숫자읽기, 체력, 임프하나만두기 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-106',
  name: '체력이 1 일 때 맞으면 체력이 0 아래로 내려가지 않는다',
  held: '보류 — 켜진 오브젝트 중에 /Showcase HUD/Button  이 없습니다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에 들어가 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('체력을 1 로 바꾸고 무적을 끈 채 임프에게 맞는다', async () => {
      await GM(game, '/gm hp 1');
      await 머리위숫자글(game, 던전화면.내피해숫자, 20_000);
      const 상태 = await 상태읽기(game, true);
      await verify('체력이 1 일 때 맞으면 체력이 0 아래로 내려가지 않는다', 체력(상태).지금 >= 0, true);
    });

    await test.step('체력을 1000 으로 바꾸고 「물약」을 누른다', async () => {
      await 던전으로(game, 아이디, 비밀번호);
      await GM(game, '/gm killall');
      await GM(game, '/gm heal');
      await GM(game, '/gm hp 1000');
      await 던전화면.지금(game).물약누르기();
      await 머리위숫자읽기(game, 던전화면.회복숫자);
      const 상태 = await 상태읽기(game, true);
      await verify('체력이 기본 체력 위로 오르지 않는다', 체력(상태).지금 <= 체력(상태).최대, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
