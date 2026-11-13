import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 와이파이 } from './helpers/device.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-672',
  name: '구매 직후 와이파이를 끊었다 켜면 골드는 많아야 30 줄고 게임이 멈추지 않는다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 상점 창이 열려 있다'],
  techniques: ['오류 추정'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    loginPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    최대줄어든골드: z.number().describe('줄어도 되는 골드 최댓값').default(30),
  }),
  held: '보류 — 연결을 갑자기 끊으면 서버가 그 계정 접속을 놓지 않아 뒤 케이스가 「같은 계정으로 이미 접속 중」으로 막힌다',
});

test(spec, async ({ game, driver, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점 창을 연다', async () => {
      const 상점 = await 상점창.열기(game);
      await verify('상점 창의 보유 골드가 30 이상이다', (await 상점.보유골드()) >= 30, true, { blocker: true });
    });

    let 앞골드 = 0;
    await test.step('「체력 물약」의 「구매」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
      const 상점 = await 상점창.열기(game);
      앞골드 = await 상점.hud.골드();
      await 상점.구매누르기('체력 물약');
      await 와이파이(driver, false);
      await 와이파이(driver, true);
    });

    await test.step('게임 화면과 골드를 확인한다', async () => {
      const 멈추지않음 = await verify('로비 화면이 다시 보인다', await 뜨는지(game, 로비.제목, 60_000), true);
      const 상점 = await 상점창.열기(game);
      const 적게줄었다 = await verify('골드가 30 이하로 줄어든다', 앞골드 - (await 상점.hud.골드()) <= expected.최대줄어든골드, true);
      await verify('구매 직후 와이파이를 끊었다 켜면 골드는 많아야 30 줄고 게임이 멈추지 않는다', 멈추지않음 && 적게줄었다, true);
    });
  } finally {
    await 와이파이(driver, true);
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
