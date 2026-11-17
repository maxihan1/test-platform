import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-274',
  name: '가방 창이 열린 채 상점 창을 열면 가방 창이 닫힌다',
  held: '보류 — 상점 창 제목(/Showcase HUD/Window 상점/Panel 상점/TitleBar/Text)이 10초 안에 뜨지 않았습니다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('가방 창을 연 채 메뉴 「상점」을 누른다', async () => {
      await 가방창.열기(game);
      await new 공통HUD(game).메뉴누르기('상점');
      await game.waitFor(상점창.제목, { timeoutMs: 10_000 });
      await verify('가방 창이 열린 채 상점 창을 열면 가방 창이 닫힌다', await 가방창.지금(game).열렸나(), false);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
