import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 새캐릭터, 순간이동, 아이템주기, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-127',
  name: '파란 물약 50개를 받으면 쓴 칸이 1 늘어난다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['item:potion_mp_s', 'zone:Town'],
  params: z.object({
    수량: z.number().int().min(1).max(999).describe('받을 파란 물약 수량 — 1 이상 999 이하').default(50),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa127');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('파란 물약 50개를 받는다', async () => {
      const 앞 = (await 가방(admin, 나!)).used;
      const 뒤 = (await 아이템주기(admin, 나!, 'potion_mp_s', { 수량: params.수량 })).used;
      await verify('파란 물약 50개를 받으면 쓴 칸이 1 늘어난다', 뒤 - 앞, 1);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
