import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기, 사기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-220',
  name: '물건을 두 번 사면 「상점에서 물건 구매」 진행은 「1/1」이다',
  platforms: ['android'],
  precondition: ['골드가 60 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'quest:shop_buy', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    진행: z.string().describe('「상점에서 물건 구매」 진행').default('1/1'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 60 이상이다', (await 대기실.hud.골드()) >= 60, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점에서 「체력 물약」을 두 번 산 뒤 일일 퀘스트 창을 연다', async () => {
      await 사기(game, '체력 물약', 2);
      const 퀘스트 = await 퀘스트창.열기(game);
      await verify('물건을 두 번 사면 「상점에서 물건 구매」 진행은 「1/1」이다', await 퀘스트.진행('상점에서 물건 구매'), expected.진행);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
