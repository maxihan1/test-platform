import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-163',
  name: '「구매」를 한 번 누르면 확인 창 없이 물약이 1개 는다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    늘어난개수: z.number().describe('늘어나는 물약 수').default(1),
    가격: z.number().describe('「체력 물약」 가격').default(30),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 30 이상이다', (await 대기실.hud.골드()) >= 30, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점에서 「체력 물약」의 「구매」를 한 번 누른다', async () => {
      const 상점 = await 상점창.열기(game);
      const 앞골드 = await 상점.보유골드();
      await 상점.구매누르기('체력 물약');
      await 상점.보유골드가될때까지(앞골드 - expected.가격);
      await 상점.닫기누르기();
    });

    await test.step('가방 창에서 「체력 물약」 개수를 확인한다', async () => {
      const 가방 = await 가방창.열기(game);
      await verify('「구매」를 한 번 누르면 확인 창 없이 물약이 1개 는다', (await 가방.개수읽기('체력 물약')) - 앞개수, expected.늘어난개수);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
