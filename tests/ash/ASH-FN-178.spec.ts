import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 개수, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-178',
  name: '+2 롱 소드를 강화하면 주문서 1장과 골드 100 × 3 = 300 이 준다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +2 롱 소드와 무기 강화 주문서 2장을 가지고 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 +2 롱 소드와 무기 강화 주문서 2장을 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn178');
      await 아이템주기(admin, 누구, 'sword_long', { 강화: 2 });
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 2 });
    });
    await test.step('+2 롱 소드와 무기 강화 주문서 2장이 있는지 확인한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      await verify('가방의 롱 소드가 +2 이다', 찾기(가방값, 'sword_long')?.enhanceLevel, 2, { blocker: true });
      await verify('가방의 무기 강화 주문서가 2장이다', 개수(가방값, 'scroll_weapon'), 2, { blocker: true });
    });
    await test.step('+2 롱 소드를 강화한다', async () => {
      const 전 = await 가방받기(request, 누구!);
      const 골드전 = (await 캐릭터읽기(admin, 누구!)).gold;
      await 본문<강화응답>(await 강화요청(request, 누구!, 찾기(전, 'sword_long')!.id, 찾기(전, 'scroll_weapon')!.id), '+2 롱 소드 강화');
      const 후 = await 가방받기(request, 누구!);
      const 주문서 = await verify('줄어든 무기 강화 주문서가 1장이다', 개수(전, 'scroll_weapon') - 개수(후, 'scroll_weapon'), 1);
      const 골드 = await verify('줄어든 골드가 300 이다', 골드전 - (await 캐릭터읽기(admin, 누구!)).gold, 300);
      await verify('+2 롱 소드를 강화하면 주문서 1장과 골드 100 × 3 = 300 이 준다', 주문서 && 골드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
