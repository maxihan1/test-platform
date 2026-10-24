import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-532',
  name: '골드만 바꾸면 골드가 바뀌고 레벨이 1 그대로다',
  platforms: ['android'],
  precondition: ['레벨 1 · 골드 500 인 새 캐릭터가 있다'],
  elements: ['flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('레벨 1 · 골드 500 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa532');
    });

    await test.step('새 캐릭터의 레벨이 1 이고 골드가 500 인지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('새 캐릭터의 레벨이 1 이다', 읽음.level, 1, { blocker: true });
      await verify('새 캐릭터의 골드가 500 이다', 읽음.gold, 500, { blocker: true });
    });

    await test.step('골드만 바꾼다', async () => {
      await 바꾸기(admin, 나!, { gold: 800 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 골드 = await verify('골드가 바뀐다', 읽음.gold !== 500, true);
      const 레벨 = await verify('레벨이 1 이다', 읽음.level, 1);
      await verify('골드만 바꾸면 골드가 바뀌고 레벨이 1 그대로다', 골드 && 레벨, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
