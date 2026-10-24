import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 상점목록받기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-160',
  name: '선량 캐릭터로 상점 목록을 받으면 priceMultiplier 1 과 templateId · price 목록이 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['npc:상인', 'state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn160');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('상점 목록을 받는다', async () => {
      const 목록 = await 상점목록받기(request, 누구!);
      const 배율 = await verify('priceMultiplier 가 1 이다', 목록.priceMultiplier, 1);
      const 줄들 = await verify(
        '상점 목록의 줄마다 templateId 와 price 가 있다',
        목록.items.length > 0 && 목록.items.every((i) => typeof i.templateId === 'string' && typeof i.price === 'number'),
        true,
      );
      await verify('선량 캐릭터로 상점 목록을 받으면 priceMultiplier 1 과 templateId · price 목록이 온다', 배율 && 줄들, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
