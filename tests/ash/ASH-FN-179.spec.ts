import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 아이템주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-179',
  name: '골드 299 로 +2 롱 소드를 강화하면 409 「INSUFFICIENT_GOLD」다',
  platforms: ['android'],
  precondition: [
    '골드 299 인 새 전사 캐릭터가 +2 롱 소드와 무기 강화 주문서를 가지고 있다',
    '골드 300 인 새 전사 캐릭터가 +2 롱 소드와 무기 강화 주문서를 가지고 있다',
  ],
  techniques: ['경계값 분석'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 모자란: 캐릭터 | undefined;
  let 딱맞는: 캐릭터 | undefined;
  try {
    await test.step('골드 299 인 캐릭터와 골드 300 인 캐릭터에게 +2 롱 소드와 무기 강화 주문서를 준다', async () => {
      모자란 = await 새골드캐릭터(admin, 'qafn179', 299);
      딱맞는 = await 새골드캐릭터(admin, 'qafn179', 300);
      for (const 누구 of [모자란, 딱맞는]) {
        await 아이템주기(admin, 누구, 'sword_long', { 강화: 2 });
        await 아이템주기(admin, 누구, 'scroll_weapon');
      }
    });
    await test.step('두 캐릭터의 골드와 +2 롱 소드를 확인한다', async () => {
      await verify('첫째 캐릭터의 골드가 299 이다', (await 캐릭터읽기(admin, 모자란!)).gold, 299, { blocker: true });
      await verify('둘째 캐릭터의 골드가 300 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 300, { blocker: true });
      await verify('첫째 캐릭터의 롱 소드가 +2 이다', 찾기(await 가방받기(request, 모자란!), 'sword_long')?.enhanceLevel, 2, { blocker: true });
      await verify('둘째 캐릭터의 롱 소드가 +2 이다', 찾기(await 가방받기(request, 딱맞는!), 'sword_long')?.enhanceLevel, 2, { blocker: true });
    });
    await test.step('+2 롱 소드를 강화한다', async () => {
      const 모자란가방 = await 가방받기(request, 모자란!);
      const 거절 = await 강화요청(request, 모자란!, 찾기(모자란가방, 'sword_long')!.id, 찾기(모자란가방, 'scroll_weapon')!.id);
      const 상태 = await verify('첫째 캐릭터의 강화 응답 코드가 409 이다', 거절.status(), 409);
      const 코드 = await verify('첫째 캐릭터의 강화 오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(거절), 'INSUFFICIENT_GOLD');
      await verify('골드 299 로 +2 롱 소드를 강화하면 409 「INSUFFICIENT_GOLD」다', 상태 && 코드, true);
      const 딱맞는가방 = await 가방받기(request, 딱맞는!);
      const 응답 = await 본문<강화응답>(
        await 강화요청(request, 딱맞는!, 찾기(딱맞는가방, 'sword_long')!.id, 찾기(딱맞는가방, 'scroll_weapon')!.id),
        '+2 롱 소드 강화',
      );
      const 삼 = await verify('둘째 캐릭터의 롱 소드가 +3 이 된다', 응답.toLevel, 3);
      const 영 = await verify('둘째 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 0);
      await verify('골드 300 으로 +2 롱 소드를 강화하면 +3 이 되고 골드가 0 이 된다', 삼 && 영, true);
    });
  } finally {
    if (모자란 !== undefined) await 캐릭터지우기(admin, 모자란);
    if (딱맞는 !== undefined) await 캐릭터지우기(admin, 딱맞는);
  }
});
