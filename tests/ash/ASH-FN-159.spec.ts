import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-159',
  name: '골드 0 으로 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」이고 가방이 그대로다',
  platforms: ['android'],
  precondition: ['골드가 0 인 새 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 0 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa159');
      await 바꾸기(admin, 나, { gold: 0 });
    });

    await test.step('골드가 0 인지 확인한다', async () => {
      await verify('골드가 0 이다', (await 가방(admin, 나!)).gold, 0, { blocker: true });
    });

    await test.step('빨간 물약 1개를 산다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 응답 = await 상점사기(admin, 나!, 'potion_hp_s', 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INSUFFICIENT_GOLD」다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      const 뒤 = await 가방(admin, 나!);
      const 칸 = await verify('가방 쓴 칸이 그대로다', 뒤.used, 앞.used);
      const 물약 = await verify('빨간 물약 수량이 그대로다', 개수(뒤, 'potion_hp_s'), 개수(앞, 'potion_hp_s'));
      await verify('골드 0 으로 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」이고 가방이 그대로다', 코드 && 이름 && 칸 && 물약, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
