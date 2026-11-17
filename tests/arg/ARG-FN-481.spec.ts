import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과같이던전으로, 임프에게맞은피해읽기, 임프하나만두기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-481',
  name: '던전에 2명일 때 레벨 1 탱커가 장비 없이 임프에게 맞으면 받은 피해가 11 이다',
  platforms: ['android'],
  precondition: [
    '일반 회원이 두 번째 플레이어 봇과 둘이 탱커로 던전에 들어가 임프 하나를 불러냈다',
    '일반 회원이 두 번째 · 세 번째 플레이어 봇과 셋이 탱커로 던전에 들어가 임프 하나를 불러냈다',
  ],
  techniques: ['경계값 분석'],
  elements: ['class:tank', 'monster:imp'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    thirdId: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    thirdPassword: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 셋째아이디 = params.thirdId ?? '';
  const 셋째비밀번호 = params.thirdPassword ?? '';
  try {
    await test.step('세 계정을 처음 상태로 되돌리고 두 번째 플레이어 봇과 둘이 던전에 들어가 임프 하나를 불러낸다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 계정되돌리기(admin, 셋째아이디, 셋째비밀번호, 'base');
      await 봇과같이던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 });
      await 임프하나만두기(game);
    });
    await test.step('던전에 둘이 있는지 확인한다', async () => {
      const 접속 = (await 접속자(admin)).players.map((사람) => 사람.user);
      await verify('접속해 있는 플레이어가 2명이다', 접속.filter((이름) => [아이디, 둘째아이디].includes(이름)).length, 2, { blocker: true });
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끈 채 임프에게 맞는다', async () => {
      await verify('던전에 2명일 때 레벨 1 탱커가 장비 없이 임프에게 맞으면 받은 피해가 11 이다', await 임프에게맞은피해읽기(game), 11);
    });

    await test.step('세 번째 플레이어 봇을 켜 던전에 셋이 되게 하고 새 임프를 불러낸다', async () => {
      await 봇켜기(admin, { user: 셋째아이디, pass: 셋째비밀번호 });
      await 임프하나만두기(game);
    });
    await test.step('던전에 셋이 있는지 확인한다', async () => {
      const 접속 = (await 접속자(admin)).players.map((사람) => 사람.user);
      await verify('접속해 있는 플레이어가 3명이다', 접속.filter((이름) => [아이디, 둘째아이디, 셋째아이디].includes(이름)).length, 3, { blocker: true });
      await verify('던전에 새 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끈 채 새 임프에게 맞는다', async () => {
      await verify('던전에 3명일 때 레벨 1 탱커가 장비 없이 임프에게 받은 피해가 15 다', await 임프에게맞은피해읽기(game), 15);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
    await 계정되돌리기(admin, 셋째아이디, 셋째비밀번호, 'base');
  }
});
