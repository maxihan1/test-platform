import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-166',
  name: '골드가 충분할 때 「체력 물약」을 사면 골드가 30 줄어든다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄어든골드: z.number().describe('줄어드는 골드').default(30),
  }),
  smoke: true,
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 30 이상이다', (await 대기실.hud.골드()) >= 30, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점에서 「체력 물약」의 「구매」를 누른다', async () => {
      const 상점 = await 상점창.열기(game);
      const 앞골드 = await 상점.hud.골드();
      await 상점.구매누르기('체력 물약');
      await 상점.보유골드가될때까지(앞골드 - expected.줄어든골드);
      await verify('골드가 충분할 때 「체력 물약」을 사면 골드가 30 줄어든다', 앞골드 - (await 상점.hud.골드()), expected.줄어든골드);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
