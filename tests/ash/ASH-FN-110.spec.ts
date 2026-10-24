import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-110',
  name: '골드 999 로 1,000 골드 사슬 갑옷을 사면 409 「INSUFFICIENT_GOLD」이고 골드가 999 그대로다',
  platforms: ['android'],
  precondition: ['골드 999 인 새 전사 캐릭터가 있다', '골드 1,000 인 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:armor_chain', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 모자란: 캐릭터 | undefined;
  let 딱맞는: 캐릭터 | undefined;
  try {
    await test.step('골드 999 인 캐릭터와 골드 1,000 인 캐릭터를 만든다', async () => {
      모자란 = await 새골드캐릭터(admin, 'qafn110', 999);
      딱맞는 = await 새골드캐릭터(admin, 'qafn110', 1000);
    });
    await test.step('두 캐릭터의 골드를 확인한다', async () => {
      await verify('첫째 캐릭터의 골드가 999 이다', (await 캐릭터읽기(admin, 모자란!)).gold, 999, { blocker: true });
      await verify('둘째 캐릭터의 골드가 1,000 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 1000, { blocker: true });
    });
    await test.step('사슬 갑옷을 산다', async () => {
      const 거절 = await 구매하기(request, 모자란!, 'armor_chain');
      const 상태 = await verify('구매 응답 코드가 409 이다', 거절.status(), 409);
      const 코드 = await verify('구매 오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(거절), 'INSUFFICIENT_GOLD');
      const 그대로 = await verify('첫째 캐릭터의 골드가 999 그대로다', (await 캐릭터읽기(admin, 모자란!)).gold, 999);
      await verify('골드 999 로 1,000 골드 사슬 갑옷을 사면 409 「INSUFFICIENT_GOLD」이고 골드가 999 그대로다', 상태 && 코드 && 그대로, true);
      const 성사 = await 구매하기(request, 딱맞는!, 'armor_chain');
      const 샀다 = await verify('구매 응답이 성공이다', 성사.ok(), true);
      const 영 = await verify('둘째 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 딱맞는!)).gold, 0);
      await verify('골드 1,000 으로 사슬 갑옷을 사면 사지고 골드가 0 이 된다', 샀다 && 영, true);
    });
  } finally {
    if (모자란 !== undefined) await 캐릭터지우기(admin, 모자란);
    if (딱맞는 !== undefined) await 캐릭터지우기(admin, 딱맞는);
  }
});
