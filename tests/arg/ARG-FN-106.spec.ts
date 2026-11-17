import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내체력이될때까지, 둘이서던전으로, 물약개수가될때까지, 임프하나만두기 } from './helpers/battle.helper.js';
import { 체력숫자 } from './helpers/economy.helper.js';
import { GM, 계정되돌리기, 봇끄기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-106',
  name: '체력이 1 일 때 임프에게 맞으면 체력이 0 아래로 가지 않고 0 이다',
  platforms: ['android'],
  precondition: [
    '일반 회원이 두 번째 플레이어 봇과 둘이 탱커로 던전에 들어가 체력을 1 로 바꾸고 임프 하나를 불러냈다',
    '일반 회원이 두 번째 플레이어 봇과 둘이 탱커로 던전에 들어가 체력이 가득 찼다',
  ],
  elements: ['class:tank', 'monster:imp', 'item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 두 번째 플레이어 봇과 둘이 탱커로 던전에 들어가 체력을 가득 채운다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 }, 0);
      await GM(game, '/gm killall');
      await GM(game, '/gm heal');
    });
    await test.step('체력이 가득 찼는지 확인한다', async () => {
      await verify('체력이 가득 차 1200 이다', await 내체력이될때까지(game, 1200, 15_000), 1200, { blocker: true });
    });

    await test.step('「물약」 버튼을 누른다', async () => {
      await 던전화면.지금(game).물약누르기();
      await 물약개수가될때까지(game, 2);
      await verify('체력이 가득 찼을 때 「물약」 버튼을 눌러도 체력이 기본 체력 1200 위로 가지 않는다', 체력숫자(await 상태읽기(game, true)), 1200);
    });

    await test.step('임프 하나를 불러내고 체력을 1 로 바꾼다', async () => {
      await 임프하나만두기(game);
      await GM(game, '/gm hp 1');
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끈 채 임프에게 맞는다', async () => {
      await verify('체력이 1 일 때 임프에게 맞으면 체력이 0 아래로 가지 않고 0 이다', await 내체력이될때까지(game, 0, 25_000), 0);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
