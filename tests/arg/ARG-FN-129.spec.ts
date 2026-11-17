import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방개수가될때까지, 가방화면개수, 보스방으로, 서버아이템개수 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-129',
  name: '전설 장비 확률을 100% 로 두고 보스를 처치하면 가방에 「불꽃의 검」이 들어온다',
  platforms: ['android'],
  precondition: ['전리품을 「불꽃의 검」으로 고정한 일반 회원이 던전 보스 방에 와 있다', '전리품을 「보스의 왕관 조각」으로 고정한 일반 회원이 던전 보스 방에 와 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:flame_sword', 'item:boss_crown_shard', 'drop:boss'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방에서 전리품을 「불꽃의 검」으로 고정한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
      await GM(game, '/gm loot 불꽃의 검');
    });
    await test.step('던전을 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      const 화면 = await verify('가방 창의 「불꽃의 검」이 1개다', await 가방개수가될때까지(game, '불꽃의 검', 1), 1);
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 서버아이템개수(값.items, '불꽃의 검') === 1);
      const 저장 = await verify('서버에 저장된 「불꽃의 검」이 1개다', 서버아이템개수(서버.items, '불꽃의 검'), 1);
      await verify('전설 장비 확률을 100% 로 두고 보스를 처치하면 가방에 「불꽃의 검」이 들어온다', 화면 && 저장, true);
    });

    let 왕관전 = 0;
    let 검전 = 0;
    let 갑옷전 = 0;
    await test.step('결과 화면이 지나 로비로 돌아온 뒤 다시 던전 보스 방에서 전설 장비가 안 나오게 전리품을 「보스의 왕관 조각」으로 고정한다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
      await GM(game, '/gm loot 보스의 왕관 조각');
      왕관전 = await 가방화면개수(game, '보스의 왕관 조각');
      검전 = await 가방화면개수(game, '불꽃의 검');
      갑옷전 = await 가방화면개수(game, '용비늘 갑옷');
    });
    await test.step('다시 던전을 확인한다', async () => {
      await verify('다시 들어간 던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });
    await test.step('전설 장비가 안 나오게 고정한 채 보스 임프를 처치한다', async () => {
      await GM(game, '/gm killboss');
      const 왕관 = await verify('가방 창의 「보스의 왕관 조각」이 1개 늘어난다', await 가방개수가될때까지(game, '보스의 왕관 조각', 왕관전 + 1), 왕관전 + 1);
      const 전설 = await verify('가방 창의 전설 장비 개수가 그대로다', (await 가방화면개수(game, '불꽃의 검')) + (await 가방화면개수(game, '용비늘 갑옷')), 검전 + 갑옷전);
      await verify('전설 장비 확률이 0% 일 때는 가방에 「보스의 왕관 조각」이 들어오고 전설 장비는 없다', 왕관 && 전설, true);
    });
  } finally {
    await GM(game, '/gm loot off');
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
