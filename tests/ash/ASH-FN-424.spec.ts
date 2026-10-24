import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 응답몸, 캐릭터읽기, type 스탯, type 가방정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장착응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-424',
  name: '가죽 투구를 장착하면 응답에 inventory 와 stats 가 있고 방어력이 2 오른다',
  platforms: ['android'],
  precondition: ['가죽 투구를 가진 새 캐릭터가 있다'],
  elements: ['item:helm_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 투구 = 0;
  try {
    await test.step('가죽 투구를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa424');
      투구 = (await 새아이템주기(admin, 나, 'helm_leather')).id;
    });

    await test.step('가방에 장착하지 않은 가죽 투구가 있는지 확인한다', async () => {
      const 그투구 = (await 가방(admin, 나!)).items.find((x) => x.id === 투구);
      await verify('가방에 장착하지 않은 가죽 투구가 있다', 그투구?.equippedSlot, null, { blocker: true });
    });

    await test.step('가죽 투구를 장착한다', async () => {
      const 전 = (await 캐릭터읽기(admin, 나!)).stats.defense;
      const 응답 = await 장착응답(admin, 나!, 투구);
      const 코드 = await verify('장착 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ inventory: 가방정보; stats: 스탯 }>(응답);
      const 가방칸 = await verify('응답에 inventory 가 있다', 'inventory' in 몸, true);
      const 스탯칸 = await verify('응답에 stats 가 있다', 'stats' in 몸, true);
      const 오름 = await verify('방어력이 2 오른다', 몸.stats.defense - 전, 2);
      await verify('가죽 투구를 장착하면 응답에 inventory 와 stats 가 있고 방어력이 2 오른다', 코드 && 가방칸 && 스탯칸 && 오름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
