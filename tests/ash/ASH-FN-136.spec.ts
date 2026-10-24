import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 물약만가지기, 수량주기, 칸나누기, 칸들 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-136',
  name: '빨간 물약이 999 를 넘치면 넘친 양이 새 칸에 들어간다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개를 가진 새 캐릭터가 있다'],
  elements: ['item:potion_hp_s'],
  params: z.object({
    수량: z.number().int().min(990).max(5000).describe('더 받을 빨간 물약 수량 — 990 이상 5000 이하 (가진 10개와 합쳐 999개를 넘는 수량)').default(1000),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 10개를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa136');
      await 물약만가지기(admin, 나, 10);
    });

    await test.step('빨간 물약 10개를 가졌는지 확인한다', async () => {
      await verify('빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
    });

    await test.step('빨간 물약 1000개를 더 받는다', async () => {
      const 지금 = await 수량주기(admin, 나!, 'potion_hp_s', params.수량);
      await verify('빨간 물약이 999 를 넘치면 넘친 양이 새 칸에 들어간다', 칸들(지금, 'potion_hp_s'), 칸나누기(10 + params.수량));
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
