import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'ARG-UI-128',
  name: '로비에서 메뉴 「상점」을 누르면 상점 창이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 던전에 들어와 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('로비에서 메뉴 「상점」을 누른다', async () => {
      await game.click(공통HUD.메뉴버튼('상점'));
      const 열림 = await game.waitFor(상점창.제목, { timeoutMs: 10_000 }).then(() => true, () => false);
      await verify('로비에서 메뉴 「상점」을 누르면 상점 창이 열린다', 열림, true);
    });
    await test.step('상점 창을 닫고 탱커로 던전에 들어간다', async () => {
      await 상점창.지금(game).닫기누르기();
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).보이나(던전화면.행동막대), true, { blocker: true });
    });
    await test.step('던전에서 메뉴 「상점」을 누른다', async () => {
      await game.click(공통HUD.메뉴버튼('상점'));
      const 열림 = await game.waitFor(상점창.제목, { timeoutMs: 10_000 }).then(() => true, () => false);
      await verify('던전에서 메뉴 「상점」을 누르면 상점 창이 열린다', 열림, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
