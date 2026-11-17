import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 글색읽기, 바탕색읽기, 알림바탕, 어두운빨강인가, 연분홍인가 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-207',
  name: '오류 알림은 바탕이 어두운 빨강, 글씨가 연분홍으로 보인다',
  platforms: ['android'],
  precondition: ['골드가 0 인 일반 회원이 로비에서 상점 창을 열었다'],
  elements: ['flow:골드-상점구매'],
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

    await test.step('골드를 0 으로 바꾸고 상점 창을 연다', async () => {
      await GM(game, '/gm gold 0');
      await 상점창.열기(game);
    });
    await test.step('상점 창이 열렸는지 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });

    await test.step('「조약돌」 「구매」를 눌러 오류 알림을 띄운다', async () => {
      await 상점창.지금(game).구매('조약돌');
      await verify('알림이 뜬다', await game.waitFor(공통HUD.알림들, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      ), true, { blocker: true });
      const 바탕 = await verify('오류 알림 바탕이 어두운 빨강이다', 어두운빨강인가(await 바탕색읽기(game, 알림바탕)), true);
      const 글씨 = await verify('오류 알림 글씨가 연분홍이다', 연분홍인가(await 글색읽기(game, 공통HUD.알림들)), true);
      await verify('오류 알림은 바탕이 어두운 빨강, 글씨가 연분홍으로 보인다', 바탕 && 글씨, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
