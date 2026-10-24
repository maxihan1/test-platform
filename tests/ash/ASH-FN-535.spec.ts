import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 아이템주기, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 새것찾기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-535',
  name: '어드민에서 가죽 투구를 주면 가방에 가죽 투구가 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['item:helm_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa535');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('어드민에서 가죽 투구 1개를 준다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 뒤 = await 아이템주기(admin, 나!, 'helm_leather', { 수량: 1 });
      await verify('어드민에서 가죽 투구를 주면 가방에 가죽 투구가 있다', 새것찾기(앞, 뒤, 'helm_leather') !== undefined, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
