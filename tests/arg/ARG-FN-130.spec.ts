import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방개수가될때까지, 보스방으로, 서버아이템개수 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-130',
  name: '보스 전리품이 「용비늘 갑옷」으로 나오면 가방에 「용비늘 갑옷」이 보인다',
  platforms: ['android'],
  precondition: ['전리품을 「용비늘 갑옷」으로 고정한 일반 회원이 던전 보스 방에 와 있다'],
  techniques: ['결정 테이블'],
  elements: ['item:dragon_armor', 'drop:boss'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방에서 전리품을 「용비늘 갑옷」으로 고정한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
      await GM(game, '/gm loot 용비늘 갑옷');
    });
    await test.step('던전을 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      await verify('보스 전리품이 「용비늘 갑옷」으로 나오면 가방에 「용비늘 갑옷」이 보인다', await 가방개수가될때까지(game, '용비늘 갑옷', 1), 1);
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 서버아이템개수(값.items, '용비늘 갑옷') === 1);
      await verify('서버에 저장된 가방에도 「용비늘 갑옷」이 있다', 서버아이템개수(서버.items, '용비늘 갑옷'), 1);
    });
  } finally {
    await GM(game, '/gm loot off');
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
