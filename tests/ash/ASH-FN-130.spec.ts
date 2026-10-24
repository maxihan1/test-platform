import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-130',
  name: '짧은 검 · 가죽 갑옷을 장착하고 빨간 물약 한 묶음을 가진 새 캐릭터는 쓴 칸이 3 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['item:sword_short', 'item:armor_leather', 'item:potion_hp_s', 'zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa130');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('가방의 쓴 칸을 읽는다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 검 = await verify('짧은 검을 장착하고 있다', 지금.items.some((x) => x.templateId === 'sword_short' && x.equippedSlot !== null), true);
      const 갑옷 = await verify('가죽 갑옷을 장착하고 있다', 지금.items.some((x) => x.templateId === 'armor_leather' && x.equippedSlot !== null), true);
      const 물약 = await verify('빨간 물약 한 묶음을 가지고 있다', 지금.items.filter((x) => x.templateId === 'potion_hp_s').length, 1);
      const 칸 = await verify('쓴 칸이 3 이다', 지금.used, 3);
      await verify('짧은 검 · 가죽 갑옷을 장착하고 빨간 물약 한 묶음을 가진 새 캐릭터는 쓴 칸이 3 이다', 검 && 갑옷 && 물약 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
