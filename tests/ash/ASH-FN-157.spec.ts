import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-157',
  name: '골드 400 으로 방어구 강화 주문서를 사면 골드가 0 이 되고 주문서가 가방에 들어온다',
  platforms: ['android'],
  precondition: ['골드가 400 인 새 캐릭터가 있다'],
  elements: ['item:scroll_armor', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 400 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa157');
      await 바꾸기(admin, 나, { gold: 400 });
    });

    await test.step('골드가 400 인지 확인한다', async () => {
      await verify('골드가 400 이다', (await 가방(admin, 나!)).gold, 400, { blocker: true });
    });

    await test.step('방어구 강화 주문서 1개를 산다', async () => {
      const 구매 = await verify('구매 응답 코드가 200 이다', (await 상점사기(admin, 나!, 'scroll_armor', 1)).status(), 200);
      const 뒤 = await 가방(admin, 나!);
      const 골드 = await verify('골드가 0 이다', 뒤.gold, 0);
      const 주문서 = await verify('방어구 강화 주문서가 가방에 1개 있다', 개수(뒤, 'scroll_armor'), 1);
      await verify('골드 400 으로 방어구 강화 주문서를 사면 골드가 0 이 되고 주문서가 가방에 들어온다', 구매 && 골드 && 주문서, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
