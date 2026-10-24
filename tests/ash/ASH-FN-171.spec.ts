import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 오류코드, 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-171',
  name: '빨간 물약 10개를 가진 캐릭터가 11개를 팔면 409 「NOT_ENOUGH_QUANTITY」다',
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
      누구 = await 새캐릭터(admin, 'qafn171');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
      await verify('새 캐릭터의 빨간 물약이 10개다', 찾기(await 가방받기(request, 누구!), 'potion_hp_s')?.quantity, 10, { blocker: true });
    });
    await test.step('빨간 물약 11개를 판다', async () => {
      const 응답 = await 판매하기(request, 누구!, 찾기(await 가방받기(request, 누구!), 'potion_hp_s')!.id, 11);
      const 상태 = await verify('판매 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('판매 오류 코드가 「NOT_ENOUGH_QUANTITY」이다', await 오류코드(응답), 'NOT_ENOUGH_QUANTITY');
      await verify('빨간 물약 10개를 가진 캐릭터가 11개를 팔면 409 「NOT_ENOUGH_QUANTITY」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
