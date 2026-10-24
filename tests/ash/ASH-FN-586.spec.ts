import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 어드민원장 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-586',
  name: '어드민에서 골드를 800 으로 바꾸면 원장에 차액 300 의 「ADMIN_ADJUST」가 남는다',
  platforms: ['android'],
  precondition: ['골드 500 인 새 캐릭터가 있다'],
  elements: ['flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드 500 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa586');
    });

    await test.step('새 캐릭터의 골드가 500 인지 확인한다', async () => {
      await verify('새 캐릭터의 골드가 500 이다', (await 캐릭터읽기(admin, 나!)).gold, 500, { blocker: true });
    });

    await test.step('어드민에서 골드를 800 으로 바꾼다', async () => {
      await 바꾸기(admin, 나!, { gold: 800 });
      const 맨앞 = (await 어드민원장(admin, 나!))[0];
      const 사유 = await verify('원장의 맨 앞 줄이 「ADMIN_ADJUST」다', 맨앞?.reason, 'ADMIN_ADJUST');
      const 차액 = await verify('원장의 맨 앞 줄 차액이 300 이다', Number(맨앞?.delta), 300);
      await verify('어드민에서 골드를 800 으로 바꾸면 원장에 차액 300 의 「ADMIN_ADJUST」가 남는다', 사유 && 차액, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
