import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 골드될때까지, 상점에서사기, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-373',
  name: '레벨 10 에서 「룬 새김 도끼」를 장착하면 공격 배율이 1 + 0.27 + 0.20 = 1.47 이다',
  platforms: ['android'],
  precondition: ['레벨 10 일반 회원이 「룬 새김 도끼」를 가졌다', '레벨 30 일반 회원이 「불꽃의 검」을 가졌다'],
  elements: ['item:rune_axe', 'item:flame_sword'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 레벨 10 으로 「룬 새김 도끼」를 산다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-373', [{ 이름: '불꽃의 검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 10');
      await GM(game, '/gm gold 900');
      await 골드될때까지(game, 900);
      await 상점에서사기(game, ['룬 새김 도끼']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('「룬 새김 도끼」를 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '룬 새김 도끼');
      const 상태 = await 상태읽기(game);
      await verify('레벨 10 에서 「룬 새김 도끼」를 장착하면 공격 배율이 1 + 0.27 + 0.20 = 1.47 이다', Number(상태['공격배율']), 1.47);
    });
    await test.step('레벨을 30 으로 바꾸고 「불꽃의 검」을 받아 가방 창을 연다', async () => {
      await GM(game, '/gm level 30');
      await 우편받기(game, 'ARG-FN-373');
      await 가방창.열기(game);
    });
    await test.step('가방에 「불꽃의 검」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「불꽃의 검」 줄이 있다', (await 가방창.지금(game).목록.이름줄('불꽃의 검')) !== null, true, { blocker: true });
    });
    await test.step('「불꽃의 검」을 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '불꽃의 검');
      const 상태 = await 상태읽기(game);
      await verify('레벨 30 에서 「불꽃의 검」을 낀 공격 배율은 최대 2.17 이다', Number(상태['공격배율']), 2.17);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
