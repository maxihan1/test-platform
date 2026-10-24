import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 성향주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-152',
  name: '골드 359 인 악명 캐릭터가 짧은 검을 사면 409 「INSUFFICIENT_GOLD」다',
  platforms: ['android'],
  precondition: ['성향치 −1 · 골드 359 인 새 전사 캐릭터가 있다', '성향치 −1 · 골드 360 인 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:sword_short', 'state:성향=악명', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 모자란: 캐릭터 | undefined;
  let 딱맞는: 캐릭터 | undefined;
  try {
    await test.step('골드 359 인 캐릭터와 골드 360 인 캐릭터를 만든다', async () => {
      모자란 = await 새골드캐릭터(admin, 'qafn152', 359);
      딱맞는 = await 새골드캐릭터(admin, 'qafn152', 360);
      await 성향주기(admin, 모자란, -1);
      await 성향주기(admin, 딱맞는, -1);
    });
    await test.step('두 캐릭터의 골드를 확인한다', async () => {
      await verify('첫째 캐릭터의 골드가 359 이다', (await 캐릭터읽기(admin, 모자란!)).gold, 359, { blocker: true });
      await verify('둘째 캐릭터의 골드가 360 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 360, { blocker: true });
      await verify('첫째 캐릭터의 성향치가 −1 이다', (await 캐릭터읽기(admin, 모자란!)).alignment.value, -1, { blocker: true });
      await verify('둘째 캐릭터의 성향치가 −1 이다', (await 캐릭터읽기(admin, 딱맞는!)).alignment.value, -1, { blocker: true });
    });
    await test.step('짧은 검을 산다', async () => {
      const 거절 = await 구매하기(request, 모자란!, 'sword_short');
      const 상태 = await verify('구매 응답 코드가 409 이다', 거절.status(), 409);
      const 코드 = await verify('구매 오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(거절), 'INSUFFICIENT_GOLD');
      await verify('골드 359 인 악명 캐릭터가 짧은 검을 사면 409 「INSUFFICIENT_GOLD」다', 상태 && 코드, true);
      const 성사 = await 구매하기(request, 딱맞는!, 'sword_short');
      const 샀다 = await verify('구매 응답이 성공이다', 성사.ok(), true);
      const 영 = await verify('둘째 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 0);
      await verify('골드 360 인 악명 캐릭터가 짧은 검을 사면 사지고 골드가 0 이 된다', 샀다 && 영, true);
    });
  } finally {
    if (모자란 !== undefined) await 캐릭터지우기(admin, 모자란);
    if (딱맞는 !== undefined) await 캐릭터지우기(admin, 딱맞는);
  }
});
