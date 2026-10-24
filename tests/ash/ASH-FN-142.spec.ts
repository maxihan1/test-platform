import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  가방채우기,
  계정지우기,
  고정비우기,
  바닥아이템만들기,
  새캐릭터,
  순간이동,
  오류코드,
  줍기,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 개수, 바닥아이템목록 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-142',
  name: '가방이 찬 캐릭터가 바닥 아이템을 주우려 하면 409 「INVENTORY_FULL」이고 바닥 아이템과 가방이 그대로다',
  platforms: ['android'],
  precondition: ['가방 40칸이 찬 새 캐릭터 옆에 바닥 아이템이 있다'],
  elements: ['item:potion_mp_s', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 떨군이: 캐릭터 | undefined;
  let 바닥번호 = 0;
  try {
    await test.step('가방 40칸이 찬 새 캐릭터 옆에 바닥 아이템을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa142');
      await 고정비우기(admin);
      await 가방채우기(admin, 나);
      await 순간이동(admin, 나, 'Beginner');
      const 만든 = await 바닥아이템만들기(admin, 'zqa142');
      떨군이 = 만든.떨군이;
      바닥번호 = 만든.바닥.id;
    });

    await test.step('가방이 찼고 바닥 아이템이 있는지 확인한다', async () => {
      await verify('가방 쓴 칸이 40 이다', (await 가방(admin, 나!)).used, 40, { blocker: true });
      const 목록 = await 바닥아이템목록(admin, 나!, 'Beginner');
      await verify('초록 들판에 바닥 아이템이 있다', 목록.some((x) => x.id === 바닥번호), true, { blocker: true });
    });

    await test.step('바닥 아이템을 줍는다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 응답 = await 줍기(admin, 나!, 바닥번호);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INVENTORY_FULL」이다', await 오류코드(응답), 'INVENTORY_FULL');
      const 목록 = await 바닥아이템목록(admin, 나!, 'Beginner');
      const 바닥 = await verify('바닥 아이템이 그대로 있다', 목록.some((x) => x.id === 바닥번호), true);
      const 뒤 = await 가방(admin, 나!);
      const 칸 = await verify('가방 쓴 칸이 그대로다', 뒤.used, 앞.used);
      const 물약 = await verify('가방에 줍지 않은 파란 물약이 그대로다', 개수(뒤, 'potion_mp_s'), 개수(앞, 'potion_mp_s'));
      await verify('가방이 찬 캐릭터가 바닥 아이템을 주우려 하면 409 「INVENTORY_FULL」이고 바닥 아이템과 가방이 그대로다', 코드 && 이름 && 바닥 && 칸 && 물약, true);
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
