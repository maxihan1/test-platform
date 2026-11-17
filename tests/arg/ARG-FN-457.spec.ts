import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지 } from './helpers/economy.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'ARG-FN-457',
  name: '상점에서 「구매」를 누른 직후 와이파이를 끊었다 다시 켜면 구매는 한 번만 반영되고 게임이 멈추지 않는다',
  held: '보류 — 켜진 오브젝트 중에 /Showcase HUD/PlayerBar/Label[1]/Text 이 없습니다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 상점 창을 열었다'],
  techniques: ['오류 추정'],
  elements: ['flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, driver, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「조약돌」 「구매」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
      const 상점 = 상점창.지금(game);
      const 전 = await 상단바골드(game);
      await 상점.끌어올리기();
      await 상점.구매('조약돌');
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => undefined);
      await 골드될때까지(game, 전 - 3, 30_000);
      const 화면 = await verify('상단 바 골드가 3 줄어든다', 전 - (await 상단바골드(game)), 3);
      const 서버 = await verify('서버에 저장된 골드가 3 줄어든다', 전 - (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 - 3, 40_000)).골드, 3);
      const 멈춤 = await verify('게임이 멈추지 않는다', (await game.find(공통HUD.상단바)) !== null, true);
      await verify('상점에서 「구매」를 누른 직후 와이파이를 끊었다 다시 켜면 구매는 한 번만 반영되고 게임이 멈추지 않는다', 화면 && 서버 && 멈춤, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
