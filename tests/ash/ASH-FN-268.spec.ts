import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  바닥아이템만들기,
  계정지우기,
  고정비우기,
  새캐릭터,
  순간이동,
  장비빼고비우기,
  줍기,
  캐릭터읽기,
  type 바닥아이템정보,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 바닥아이템목록 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-268',
  name: '다른 캐릭터가 떨어뜨린 바닥 아이템을 주우면 내 가방에 들어온다',
  platforms: ['android'],
  precondition: ['다른 캐릭터가 사망 드랍으로 떨어뜨린 아이템 옆에 새 캐릭터가 있다'],
  elements: ['item:potion_mp_s', 'zone:Beginner', 'drop:death_0이상'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 떨군이: 캐릭터 | undefined;
  let 나: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  try {
    await test.step('다른 캐릭터가 사망 드랍으로 떨어뜨린 아이템 옆에 새 캐릭터를 둔다', async () => {
      await 고정비우기(admin);
      const 만든 = await 바닥아이템만들기(admin, 'zqa268');
      떨군이 = 만든.떨군이;
      바닥 = 만든.바닥;
      나 = await 새캐릭터(admin, 'zqa268');
      await 장비빼고비우기(admin, 나);
      await 순간이동(admin, 나, { x: 바닥.x, z: 바닥.z });
    });

    await test.step('바닥 아이템과 새 캐릭터의 자리를 확인한다', async () => {
      const 목록 = await 바닥아이템목록(admin, 나!, 'Beginner');
      await verify('바닥 아이템 목록에 다른 캐릭터가 떨어뜨린 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
      const 자리 = (await 캐릭터읽기(admin, 나!)).position;
      await verify('새 캐릭터가 바닥 아이템과 같은 자리에 있다', `${String(자리.x)},${String(자리.z)}`, `${String(바닥!.x)},${String(바닥!.z)}`, {
        blocker: true,
      });
    });

    await test.step('그 바닥 아이템을 줍는다', async () => {
      const 응답 = await 줍기(admin, 나!, 바닥!.id, undefined, { x: 바닥!.x, z: 바닥!.z });
      await verify('줍기 응답이 200 이다', 응답.status(), 200);
      const 장비밖 = (await 가방(admin, 나!)).items
        .filter((x) => x.equippedSlot === null)
        .map((x) => `${x.templateId} ${String(x.quantity)}개`)
        .join(', ');
      await verify('다른 캐릭터가 떨어뜨린 바닥 아이템을 주우면 내 가방에 들어온다', 장비밖, `${바닥!.templateId} ${String(바닥!.quantity)}개`);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
  }
});
