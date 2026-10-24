import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-163',
  name: '빨간 물약 3개를 사면 골드가 90 줄고 빨간 물약이 3개 는다',
  platforms: ['android'],
  smoke: true,
  precondition: ['골드가 500 인 새 캐릭터가 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: z.object({
    수량: z.number().int().min(1).max(16).describe('살 빨간 물약 수량 — 1 이상 16 이하 (골드 500 으로 살 수 있는 수량)').default(3),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 500 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa163');
      await 바꾸기(admin, 나, { gold: 500 });
    });

    await test.step('골드가 500 인지 확인한다', async () => {
      await verify('골드가 500 이다', (await 가방(admin, 나!)).gold, 500, { blocker: true });
    });

    await test.step('빨간 물약 3개를 산다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 구매 = await verify('구매 응답 코드가 200 이다', (await 상점사기(admin, 나!, 'potion_hp_s', params.수량)).status(), 200);
      const 뒤 = await 가방(admin, 나!);
      const 골드 = await verify('골드가 줄어든 만큼이 물약값 합이다', 앞.gold - 뒤.gold, 30 * params.수량);
      const 물약 = await verify('빨간 물약이 산 수량만큼 는다', 개수(뒤, 'potion_hp_s') - 개수(앞, 'potion_hp_s'), params.수량);
      await verify('빨간 물약 3개를 사면 골드가 90 줄고 빨간 물약이 3개 는다', 구매 && 골드 && 물약, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
