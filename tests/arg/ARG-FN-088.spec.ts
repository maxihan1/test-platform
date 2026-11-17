import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로, 체력, 수치 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 봇끄기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-088',
  name: '체력이 0 이 되면 죽지 않고 쓰러진 상태가 된다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['state:생존=쓰러짐', 'move:생존 살아 있음→쓰러짐'],
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
  const 둘째 = { 아이디: params.secondId ?? '', 비밀번호: params.secondPassword ?? '' };
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 봇과 함께 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
      await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, 둘째, 0);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 내 영웅을 쓰러뜨린다', async () => {
      await GM(game, '/gm faint');
      const 상태 = await 상태읽기(game, true);
      const 체력0 = await verify('체력이 0 이 된다', 체력(상태).지금, 0);
      const 남음 = await verify('내 영웅이 던전에 남아 있다', await 던전화면.지금(game).보이나(`${던전화면.내영웅}[1]`), true);
      await verify('체력이 0 이 되면 죽지 않고 쓰러진 상태가 된다', 체력0 && 남음, true);
    });

    await test.step('쓰러진 채 「공격」 버튼을 누른다', async () => {
      await 던전화면.지금(game).누르기(던전화면.공격);
      const 상태 = await 상태읽기(game, true);
      await verify('쓰러진 동안은 「공격」 버튼을 눌러도 스킬을 쓰지 않는다', 수치(상태, '준피해') === 0 && 상태['쓴스킬'] === '-', true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
  }
});
