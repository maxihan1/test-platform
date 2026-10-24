import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 오류코드, 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-150',
  name: '장착한 짧은 검을 팔면 409 「ITEM_EQUIPPED」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_short', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn150');
    });
    await test.step('짧은 검이 장착돼 있는지 확인한다', async () => {
      await verify('짧은 검이 무기 칸에 장착돼 있다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
    });
    await test.step('장착한 짧은 검을 판다', async () => {
      const 응답 = await 판매하기(request, 누구!, 찾기(await 가방받기(request, 누구!), 'sword_short')!.id);
      const 상태 = await verify('판매 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('판매 오류 코드가 「ITEM_EQUIPPED」이다', await 오류코드(응답), 'ITEM_EQUIPPED');
      await verify('장착한 짧은 검을 팔면 409 「ITEM_EQUIPPED」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
