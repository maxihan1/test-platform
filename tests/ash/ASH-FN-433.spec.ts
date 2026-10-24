import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장착응답, 장착중인가 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-433',
  name: '장비인 가죽 투구는 장착된다',
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
      나 = await 새캐릭터(admin, 'zqa433');
      투구 = (await 새아이템주기(admin, 나, 'helm_leather')).id;
    });

    await test.step('가방에 장착하지 않은 가죽 투구가 있는지 확인한다', async () => {
      const 그투구 = (await 가방(admin, 나!)).items.find((x) => x.id === 투구);
      await verify('가방에 장착하지 않은 가죽 투구가 있다', 그투구?.equippedSlot, null, { blocker: true });
    });

    await test.step('가죽 투구를 장착한다', async () => {
      const 응답 = await 장착응답(admin, 나!, 투구);
      await verify('장착 응답이 200 이다', 응답.status(), 200);
      await verify('장비인 가죽 투구는 장착된다', 장착중인가(await 가방(admin, 나!), 투구), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
