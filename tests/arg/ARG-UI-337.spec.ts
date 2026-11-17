import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-337',
  name: '함께 던전에 들어온 두 번째 플레이어의 초상화와 체력 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 있다'],
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
    await test.step('두 계정을 처음 상태로 되돌리고 봇과 함께 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 });
    });
    const 던전 = 던전화면.지금(game);
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전.보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('파티 초상화를 확인한다', async () => {
      await 던전.뜰때까지(던전화면.아군이름);
      const 이름 = await verify('두 번째 플레이어의 초상화에 이름이 보인다', await 던전.글(던전화면.아군이름), 둘째아이디);
      const 막대 = await verify('두 번째 플레이어의 초상화에 체력 막대가 보인다', await 던전.보이나(던전화면.아군체력막대), true);
      await verify('함께 던전에 들어온 두 번째 플레이어의 초상화와 체력 막대가 보인다', 이름 && 막대, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
