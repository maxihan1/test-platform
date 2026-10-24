import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 강화되풀이, 계정지우기, 고정비우기, 새캐릭터, 어드민설정, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-187',
  name: '안전 구간 강화를 정해 둔 횟수만큼 하면 모두 성공한다',
  platforms: ['android'],
  precondition: ['+0 짧은 검과 무기 강화 주문서를 넉넉히 가진 새 캐릭터가 있다'],
  elements: ['item:sword_short', 'item:scroll_weapon', 'rate:enhance_1-3'],
  params: z.object({
    횟수: z.number().int().min(1).describe('목표 단계마다 강화할 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('+0 짧은 검과 무기 강화 주문서를 넉넉히 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa187');
      await 고정비우기(admin);
    });

    await test.step('+0 짧은 검이 있고 설정의 안전 구간이 +3 인지 확인한다', async () => {
      const 검 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'sword_short');
      await verify('가방에 +0 짧은 검이 있다', 검?.enhanceLevel, 0, { blocker: true });
      await verify('설정의 안전 구간이 +3 이다', (await 어드민설정(admin)).enhance.safeLevel, 3, { blocker: true });
    });

    await test.step('+0 → +3 강화를 정해 둔 횟수만큼 되풀이한다', async () => {
      let 성공 = 0;
      for (const 목표 of [1, 2, 3]) {
        성공 += (await 강화되풀이(admin, 나!, 'sword_short', 목표, params.횟수)).성공;
      }
      await verify('안전 구간 강화를 정해 둔 횟수만큼 하면 모두 성공한다', 성공, 3 * params.횟수);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
