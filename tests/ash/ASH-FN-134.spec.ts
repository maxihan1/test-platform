import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 물약만가지기, 수량주기, 칸나누기, 칸들 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-134',
  name: '빨간 물약이 999개가 되면 한 칸에 999개다',
  platforms: ['android'],
  precondition: ['빨간 물약 10개를 가진 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s'],
  params: z.object({
    첫수량: z.number().int().min(1).max(5000).describe('첫 번째로 더 받을 빨간 물약 수량 — 1 이상 5000 이하').default(989),
    둘째수량: z.number().int().min(1).max(5000).describe('두 번째로 더 받을 빨간 물약 수량 — 1 이상 5000 이하').default(990),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약 10개를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa134');
      await 물약만가지기(admin, 나, 10);
    });

    await test.step('빨간 물약 10개를 가졌는지 확인한다', async () => {
      await verify('빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
    });

    await test.step('빨간 물약 989개를 더 받는다', async () => {
      const 지금 = await 수량주기(admin, 나!, 'potion_hp_s', params.첫수량);
      await verify('빨간 물약이 999개가 되면 한 칸에 999개다', 칸들(지금, 'potion_hp_s'), 칸나누기(10 + params.첫수량));
    });

    await test.step('빨간 물약 990개를 더 받는다', async () => {
      await 물약만가지기(admin, 나!, 10);
      await verify('다시 정리한 빨간 물약이 10개다', 개수(await 가방(admin, 나!), 'potion_hp_s'), 10, { blocker: true });
      const 지금 = await 수량주기(admin, 나!, 'potion_hp_s', params.둘째수량);
      await verify('빨간 물약이 1000개가 되면 999개 칸과 1개 칸 두 칸이다', 칸들(지금, 'potion_hp_s'), 칸나누기(10 + params.둘째수량));
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
