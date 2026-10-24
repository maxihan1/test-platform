import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-517',
  name: '어드민에서 가방을 읽으면 capacity 가 40 이고 빨간 물약이 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa517');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('어드민에서 캐릭터 가방을 읽는다', async () => {
      const 읽음 = await 가방(admin, 나!);
      const 칸수 = await verify('가방 capacity 가 40 이다', 읽음.capacity, 40);
      const 물약 = await verify('가방에 빨간 물약이 있다', 읽음.items.some((x) => x.templateId === 'potion_hp_s'), true);
      await verify('어드민에서 가방을 읽으면 capacity 가 40 이고 빨간 물약이 있다', 칸수 && 물약, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
