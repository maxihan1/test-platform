import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새아이템주기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-112',
  name: '+3 짧은 검을 받으면 판매가가 100 × (1 + 3 / 2) 를 버림한 250 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['item:sword_short', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa112');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('+3 짧은 검을 받아 판매가를 읽는다', async () => {
      const 검 = await 새아이템주기(admin, 나!, 'sword_short', { 강화: 3 });
      await verify('+3 짧은 검을 받으면 판매가가 100 × (1 + 3 / 2) 를 버림한 250 이다', 검.sellPrice, 250);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
