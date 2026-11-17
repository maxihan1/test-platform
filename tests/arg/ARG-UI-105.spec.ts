import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점에서사기, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-105',
  name: '가방 창의 아이템 이름이 일반 #E8E2D6 · 희귀 #5AB8FF · 영웅 #C77DFF · 전설 #FF9A3C 글자색으로 보인다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「불꽃의 검」을 가진 일반 회원으로 로비에 있다'],
  elements: ['item:rusty_dagger', 'item:steel_longsword', 'item:rune_axe', 'item:flame_sword'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 네 아이템을 가방에 넣는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-105', [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '강철 롱소드', 개수: 1 }, { 이름: '불꽃의 검', 개수: 1 }], 800);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-UI-105');
      await 상점에서사기(game, ['룬 새김 도끼']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 일반 = await verify('「녹슨 단검」 이름이 일반 #E8E2D6 글자색으로 보인다', await 가방.이름글자색('녹슨 단검'), '#E8E2D6');
      const 희귀 = await verify('「강철 롱소드」 이름이 희귀 #5AB8FF 글자색으로 보인다', await 가방.이름글자색('강철 롱소드'), '#5AB8FF');
      const 영웅 = await verify('「룬 새김 도끼」 이름이 영웅 #C77DFF 글자색으로 보인다', await 가방.이름글자색('룬 새김 도끼'), '#C77DFF');
      const 전설 = await verify('「불꽃의 검」 이름이 전설 #FF9A3C 글자색으로 보인다', await 가방.이름글자색('불꽃의 검'), '#FF9A3C');
      await verify('가방 창의 아이템 이름이 일반 #E8E2D6 · 희귀 #5AB8FF · 영웅 #C77DFF · 전설 #FF9A3C 글자색으로 보인다', 일반 && 희귀 && 영웅 && 전설, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
