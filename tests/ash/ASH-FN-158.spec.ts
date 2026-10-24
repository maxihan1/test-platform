import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-158',
  name: '골드 399 로 방어구 강화 주문서를 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 399 그대로다',
  platforms: ['android'],
  precondition: ['골드가 399 인 새 캐릭터가 있다', '골드가 400 인 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:scroll_armor', 'flow:골드-상점구매'],
  params: z.object({
    모자란골드: z.number().int().min(0).max(399).describe('캐릭터의 골드 — 0 이상 399 이하 (방어구 강화 주문서 값 400 에 모자란 금액)').default(399),
    딱맞는골드: z.number().int().min(400).max(100000).describe('캐릭터의 골드 — 400 이상 100000 이하 (사고 남는 골드는 이 값에서 400 을 뺀 값)').default(400),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa158');
    });

    await test.step('새 캐릭터가 방어구 강화 주문서를 갖지 않았는지 확인한다', async () => {
      const 주문서 = (await 가방(admin, 나!)).items.filter((x) => x.templateId === 'scroll_armor').length;
      await verify('방어구 강화 주문서가 없다', 주문서, 0, { blocker: true });
    });

    await test.step('방어구 강화 주문서 1개를 산다', async () => {
      await 바꾸기(admin, 나!, { gold: params.모자란골드 });
      await verify('골드가 399 다', (await 가방(admin, 나!)).gold, params.모자란골드, { blocker: true });
      const 앞 = (await 가방(admin, 나!)).gold;
      const 응답 = await 상점사기(admin, 나!, 'scroll_armor', 1);
      const 코드 = await verify('골드가 모자란 구매의 응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('골드가 모자란 구매의 오류 코드가 「INSUFFICIENT_GOLD」다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      const 골드 = await verify('골드가 그대로다', (await 가방(admin, 나!)).gold, 앞);
      await verify('골드 399 로 방어구 강화 주문서를 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 399 그대로다', 코드 && 이름 && 골드, true);
    });

    await test.step('방어구 강화 주문서 1개를 사고 골드를 읽는다', async () => {
      await 바꾸기(admin, 나!, { gold: params.딱맞는골드 });
      await verify('골드가 400 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드, { blocker: true });
      const 구매 = await verify('골드가 딱 맞는 구매의 응답 코드가 200 이다', (await 상점사기(admin, 나!, 'scroll_armor', 1)).status(), 200);
      const 남음 = await verify('읽은 골드가 0 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드 - 400);
      await verify('골드 400 으로 방어구 강화 주문서를 산 뒤 골드를 읽으면 0 이다', 구매 && 남음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
