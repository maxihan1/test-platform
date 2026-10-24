import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 초기화, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 어드민원장 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-589',
  name: '캐릭터를 초기화하면 원장에 「ADMIN_RESET」이 남는다',
  platforms: ['android'],
  precondition: ['골드를 바꾼 새 캐릭터가 있다'],
  elements: ['flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드를 바꾼 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa589');
      await 바꾸기(admin, 나, { gold: 800 });
    });

    await test.step('새 캐릭터의 골드가 800 인지 확인한다', async () => {
      await verify('새 캐릭터의 골드가 800 이다', (await 캐릭터읽기(admin, 나!)).gold, 800, { blocker: true });
    });

    await test.step('어드민에서 캐릭터를 초기화하고 원장을 읽는다', async () => {
      await 초기화(admin, 나!);
      const 원장 = await 어드민원장(admin, 나!);
      await verify('캐릭터를 초기화하면 원장에 「ADMIN_RESET」이 남는다', 원장.some((x) => x.reason === 'ADMIN_RESET'), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
