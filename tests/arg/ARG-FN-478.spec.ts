import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 서버가방수량 } from './helpers/economy.helper.js';
import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 접속안내창 } from './pages/notice.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-478',
  name: '「구매」를 누른 직후 와이파이를 끊었다 다시 켜면 서버의 「체력 물약」이 1개만 늘어 4개다',
  platforms: ['android'],
  precondition: ['골드 200 · 「체력 물약」 3개인 일반 회원이 로비에서 상점 창을 열었다'],
  techniques: ['오류 추정'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      const 상점 = await 상점창.열기(game);
      await 상점.끌어올리기();
    });
    await test.step('상점 창을 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });

    await test.step('「체력 물약」 「구매」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
      if (!(await 상점창.지금(game).구매('체력 물약'))) throw new Error('상점에 「체력 물약」 줄이 없다');
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 접속안내창.제목이될때까지(game, '연결 끊김', 30_000);
      });
    });

    const 값 = await 저장될때까지(admin, 아이디, (캐릭터값) => 서버가방수량(캐릭터값, '체력 물약') === 4 && 캐릭터값.골드 === 170, 40_000);
    await test.step('서버에 저장된 「체력 물약」 개수를 확인한다', async () => {
      await verify('「구매」를 누른 직후 와이파이를 끊었다 다시 켜면 서버의 「체력 물약」이 1개만 늘어 4개다', 서버가방수량(값, '체력 물약'), 4);
    });
    await test.step('서버에 저장된 골드를 확인한다', async () => {
      await verify('서버의 골드가 한 번 값 30 만 줄어 170 이다', 값.골드, 170);
    });
    await test.step('와이파이를 다시 켠 뒤 화면을 확인한다', async () => {
      const 자리 = await 지금화면(game, 60_000);
      await verify('와이파이를 다시 켠 뒤 게임이 멈추지 않고 로그인 화면이나 로비가 보인다', 자리 === '로그인' || 자리 === '로비', true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
