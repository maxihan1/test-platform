import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 강화하기, 계정지우기, 바꾸기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-179',
  name: '골드 299 로 +2 짧은 검을 강화하려 하면 거부되고 골드와 주문서가 그대로다',
  platforms: ['android'],
  precondition: [
    '+2 짧은 검과 무기 강화 주문서를 가진 새 캐릭터의 골드가 299 다',
    '+2 짧은 검과 무기 강화 주문서를 가진 새 캐릭터의 골드가 300 이다',
  ],
  techniques: ['경계값 분석'],
  elements: ['item:sword_short', 'item:scroll_weapon', 'rate:enhance_1-3', 'flow:골드-강화'],
  params: z.object({
    모자란골드: z.number().int().min(0).max(299).describe('캐릭터의 골드 — 0 이상 299 이하 (강화 비용 300 에 모자란 금액)').default(299),
    딱맞는골드: z.number().int().min(300).max(100000).describe('캐릭터의 골드 — 300 이상 100000 이하 (강화하고 남는 골드는 이 값에서 300 을 뺀 값)').default(300),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+2 짧은 검과 무기 강화 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa179');
      검 = (await 새아이템주기(admin, 나, 'sword_short', { 강화: 2 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +2 짧은 검과 무기 강화 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 +2 짧은 검이 있다', 지금.items.find((x) => x.id === 검)?.enhanceLevel, 2, { blocker: true });
      await verify('무기 강화 주문서가 5장이다', 개수(지금, 'scroll_weapon'), 5, { blocker: true });
    });

    await test.step('+2 짧은 검을 강화한다', async () => {
      await 바꾸기(admin, 나!, { gold: params.모자란골드 });
      const 앞 = await 가방(admin, 나!);
      await verify('골드가 299 다', 앞.gold, params.모자란골드, { blocker: true });
      const 응답 = await 강화하기(admin, 나!, 검, 주문서);
      const 거부 = await verify('강화 요청이 거부된다', 응답.ok(), false);
      const 뒤 = await 가방(admin, 나!);
      const 골드 = await verify('골드가 그대로다', 뒤.gold, 앞.gold);
      const 장수 = await verify('주문서가 그대로다', 개수(뒤, 'scroll_weapon'), 개수(앞, 'scroll_weapon'));
      await verify('골드 299 로 +2 짧은 검을 강화하려 하면 거부되고 골드와 주문서가 그대로다', 거부 && 골드 && 장수, true);

      await 바꾸기(admin, 나!, { gold: params.딱맞는골드 });
      await verify('골드가 300 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드, { blocker: true });
      const 코드 = await verify('골드 300 으로 강화한 응답 코드가 200 이다', (await 강화하기(admin, 나!, 검, 주문서)).status(), 200);
      const 남음 = await verify('남은 골드가 0 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드 - 300);
      await verify('골드 300 으로 +2 짧은 검을 강화하면 골드가 0 이 된다', 코드 && 남음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
