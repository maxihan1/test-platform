import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-166',
  name: '빨간 물약 2개를 팔면 골드가 판매가 10 × 2 = 20 는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:potion_hp_s', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn166');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('빨간 물약 2개를 판다', async () => {
      const 골드전 = (await 캐릭터읽기(admin, 누구!)).gold;
      const 응답 = await 판매하기(request, 누구!, 찾기(await 가방받기(request, 누구!), 'potion_hp_s')!.id, 2);
      const 팔렸다 = await verify('판매 응답이 성공이다', 응답.ok(), true);
      const 늘었다 = await verify('늘어난 골드가 20 이다', (await 캐릭터읽기(admin, 누구!)).gold - 골드전, 20);
      await verify('빨간 물약 2개를 팔면 골드가 판매가 10 × 2 = 20 는다', 팔렸다 && 늘었다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
