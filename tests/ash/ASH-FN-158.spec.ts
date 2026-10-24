import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-158',
  name: '골드 499 로 500 골드 무기 강화 주문서를 사면 409 「INSUFFICIENT_GOLD」다',
  platforms: ['android'],
  precondition: ['골드 499 인 새 전사 캐릭터가 있다', '골드 500 인 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:scroll_weapon', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 모자란: 캐릭터 | undefined;
  let 딱맞는: 캐릭터 | undefined;
  try {
    await test.step('골드 499 인 캐릭터와 골드 500 인 캐릭터를 만든다', async () => {
      모자란 = await 새골드캐릭터(admin, 'qafn158', 499);
      딱맞는 = await 새골드캐릭터(admin, 'qafn158', 500);
    });
    await test.step('두 캐릭터의 골드를 확인한다', async () => {
      await verify('첫째 캐릭터의 골드가 499 이다', (await 캐릭터읽기(admin, 모자란!)).gold, 499, { blocker: true });
      await verify('둘째 캐릭터의 골드가 500 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 500, { blocker: true });
    });
    await test.step('무기 강화 주문서를 산다', async () => {
      const 거절 = await 구매하기(request, 모자란!, 'scroll_weapon');
      const 상태 = await verify('구매 응답 코드가 409 이다', 거절.status(), 409);
      const 코드 = await verify('구매 오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(거절), 'INSUFFICIENT_GOLD');
      await verify('골드 499 로 500 골드 무기 강화 주문서를 사면 409 「INSUFFICIENT_GOLD」다', 상태 && 코드, true);
      const 성사 = await 구매하기(request, 딱맞는!, 'scroll_weapon');
      const 샀다 = await verify('구매 응답이 성공이다', 성사.ok(), true);
      const 영 = await verify('둘째 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 0);
      await verify('골드 500 으로 무기 강화 주문서를 사면 사지고 골드가 0 이 된다', 샀다 && 영, true);
    });
  } finally {
    if (모자란 !== undefined) await 캐릭터지우기(admin, 모자란);
    if (딱맞는 !== undefined) await 캐릭터지우기(admin, 딱맞는);
  }
});
