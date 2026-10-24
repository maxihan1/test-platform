import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 장비빼고비우기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 구매, 어드민원장 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-520',
  name: '어드민 원장의 맨 앞 줄이 「SHOP_BUY」다',
  platforms: ['android'],
  precondition: ['빨간 물약을 한 번 산 새 캐릭터가 있다'],
  elements: ['flow:골드-상점구매', 'item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('빨간 물약을 한 번 산 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa520');
      await 장비빼고비우기(admin, 나);
      await 구매(admin, 나, 'potion_hp_s', 1);
    });

    await test.step('가방에 빨간 물약이 한 개 있는지 확인한다', async () => {
      const 물약 = (await 가방(admin, 나!)).items.find((x) => x.templateId === 'potion_hp_s');
      await verify('가방에 빨간 물약이 한 개 있다', 물약?.quantity, 1, { blocker: true });
    });

    await test.step('어드민에서 캐릭터 원장을 읽는다', async () => {
      const 원장 = await 어드민원장(admin, 나!);
      await verify('어드민 원장의 맨 앞 줄이 「SHOP_BUY」다', 원장[0]?.reason, 'SHOP_BUY');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
