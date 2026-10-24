import { defineCase, test, verify } from '@platform/kit';

import { 가방, 가방채우기, 계정지우기, 바꾸기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수, 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-139',
  name: '가방이 찬 캐릭터가 파란 물약을 사려 하면 409 「INVENTORY_FULL」이고 골드와 가방이 그대로다',
  platforms: ['android'],
  precondition: ['가방 40칸이 찬 새 캐릭터가 골드를 넉넉히 가지고 있다'],
  elements: ['item:potion_mp_s', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('가방 40칸이 찬 새 캐릭터를 만들고 골드를 넉넉히 준다', async () => {
      나 = await 새캐릭터(admin, 'zqa139');
      await 바꾸기(admin, 나, { gold: 10000 });
      await 가방채우기(admin, 나);
    });

    await test.step('가방이 찼고 골드가 넉넉한지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방 쓴 칸이 40 이다', 지금.used, 40, { blocker: true });
      await verify('골드가 10000 이다', 지금.gold, 10000, { blocker: true });
    });

    await test.step('파란 물약 1개를 산다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 응답 = await 상점사기(admin, 나!, 'potion_mp_s', 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INVENTORY_FULL」이다', await 오류코드(응답), 'INVENTORY_FULL');
      const 뒤 = await 가방(admin, 나!);
      const 골드 = await verify('골드가 그대로다', 뒤.gold, 앞.gold);
      const 칸 = await verify('가방 쓴 칸이 그대로다', 뒤.used, 앞.used);
      const 물약 = await verify('가방에 파란 물약이 없다', 개수(뒤, 'potion_mp_s'), 0);
      await verify('가방이 찬 캐릭터가 파란 물약을 사려 하면 409 「INVENTORY_FULL」이고 골드와 가방이 그대로다', 코드 && 이름 && 골드 && 칸 && 물약, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
