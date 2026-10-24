import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM아이템, 새것찾기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-472',
  name: 'GM 아이템으로 롱 소드 +2 를 받으면 가방에 +2 롱 소드가 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['item:sword_long'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa472');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('GM 아이템으로 롱 소드 +2 를 받는다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 응답 = await GM아이템(admin, 나!, 'sword_long', 1, 2);
      const 코드 = await verify('GM 아이템 응답이 200 이다', 응답.status(), 200);
      const 새검 = 새것찾기(앞, await 가방(admin, 나!), 'sword_long');
      const 단계 = await verify('가방에 +2 롱 소드가 있다', 새검?.enhanceLevel, 2);
      await verify('GM 아이템으로 롱 소드 +2 를 받으면 가방에 +2 롱 소드가 있다', 코드 && 단계, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
