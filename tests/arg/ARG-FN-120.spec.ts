import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로, 봇경험치, 봇경험치가오를때까지, 임프하나만두기 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 봇끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-120',
  name: '적이 죽으면 서버에 접속한 두 번째 플레이어도 따로 처치 경험치를 받는다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 있고 임프 하나를 불러냈다'],
  elements: ['monster:imp'],
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
  let 봇이름 = '';
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 두 번째 플레이어 봇과 함께 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      봇이름 = (await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 })).봇;
      await 임프하나만두기(game);
    });
    await test.step('던전에 둘이 있는지 확인한다', async () => {
      await verify('던전에 두 번째 플레이어의 초상화가 보인다', await 던전화면.지금(game).보이나(던전화면.아군초상화), true, { blocker: true });
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    let 처음경험치 = 0;
    await test.step('두 번째 플레이어의 경험치를 읽어 둔다', async () => {
      처음경험치 = await 봇경험치(admin, 봇이름);
    });

    await test.step('GM 명령으로 임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      const 나중경험치 = await 봇경험치가오를때까지(admin, 봇이름, 처음경험치);
      await verify('적이 죽으면 서버에 접속한 두 번째 플레이어도 따로 처치 경험치를 받는다', 나중경험치 > 처음경험치, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
