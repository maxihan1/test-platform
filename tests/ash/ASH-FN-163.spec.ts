import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 개수, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-163',
  name: '빨간 물약 3개를 사면 골드가 90 줄고 빨간 물약이 3개 는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn163');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('빨간 물약 3개를 산다', async () => {
      const 골드전 = (await 캐릭터읽기(admin, 누구!)).gold;
      const 물약전 = 개수(await 가방받기(request, 누구!), 'potion_hp_s');
      const 응답 = await 구매하기(request, 누구!, 'potion_hp_s', 3);
      const 샀다 = await verify('구매 응답이 성공이다', 응답.ok(), true);
      const 줄었다 = await verify('줄어든 골드가 90 이다', 골드전 - (await 캐릭터읽기(admin, 누구!)).gold, 90);
      const 늘었다 = await verify('늘어난 빨간 물약이 3개다', 개수(await 가방받기(request, 누구!), 'potion_hp_s') - 물약전, 3);
      await verify('빨간 물약 3개를 사면 골드가 90 줄고 빨간 물약이 3개 는다', 샀다 && 줄었다 && 늘었다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
