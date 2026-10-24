import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 물약만가지기, 상점팔기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-166',
  name: '빨간 물약 2개를 팔면 골드가 20 는다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개를 가진 새 캐릭터가 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점판매'],
  params: z.object({
    수량: z.number().int().min(1).max(10).describe('팔 빨간 물약 수량 — 1 이상 10 이하 (가진 10개 안)').default(2),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 10개를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa166');
      await 물약만가지기(admin, 나, 10);
    });

    await test.step('빨간 물약 10개를 가졌는지 확인한다', async () => {
      await verify('빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
    });

    await test.step('빨간 물약 2개를 판다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 물약 = 앞.items.find((x) => x.templateId === 'potion_hp_s');
      const 판매 = await verify('판매 응답 코드가 200 이다', (await 상점팔기(admin, 나!, 물약?.id ?? 0, params.수량)).status(), 200);
      const 늘어남 = await verify('골드가 판 수량의 물약값 합만큼 는다', (await 가방(admin, 나!)).gold - 앞.gold, 10 * params.수량);
      await verify('빨간 물약 2개를 팔면 골드가 20 는다', 판매 && 늘어남, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
