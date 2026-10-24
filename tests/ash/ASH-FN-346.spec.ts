import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 장비빼고비우기, 캐릭터읽기, 플레이어머리, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-346',
  name: '수량을 숫자로 주면 빨간 물약을 산다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 골드를 넉넉히 가지고 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: z.object({
    수량: z.number().int().min(1).max(100).describe('사는 빨간 물약 수량 — 1 이상 100 이하').default(3),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드를 넉넉히 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa346');
      await 장비빼고비우기(admin, 나);
      await 바꾸기(admin, 나, { gold: 1_000_000 });
    });

    await test.step('새 캐릭터가 골드를 넉넉히 가지고 있는지 확인한다', async () => {
      await verify('새 캐릭터가 골드를 넉넉히 가지고 있다', (await 캐릭터읽기(admin, 나!)).gold, 1_000_000, { blocker: true });
    });

    await test.step('수량을 숫자로 주고 빨간 물약을 산다', async () => {
      const 응답 = await admin.post('/shop/buy', { headers: 플레이어머리(나!), data: { templateId: 'potion_hp_s', quantity: params.수량 } });
      await verify('구매 응답이 200 이다', 응답.status(), 200);
      const 산것 = (await 가방(admin, 나!)).items
        .filter((x) => x.templateId === 'potion_hp_s' && x.equippedSlot === null)
        .reduce((합, x) => 합 + x.quantity, 0);
      await verify('수량을 숫자로 주면 빨간 물약을 산다', 산것, params.수량);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
