import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-058',
  name: '레벨 5 캐릭터를 읽으면 레벨업에 필요한 경험치가 1500 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa058');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('레벨을 5 로 바꾸고 캐릭터를 읽는다', async () => {
      await 바꾸기(admin, 나!, { level: 5 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 레벨 = await verify('캐릭터 레벨이 5 다', 읽음.level, 5);
      const 경험치 = await verify('레벨업에 필요한 경험치가 1500 이다', 읽음.expToNext, 1500);
      await verify('레벨 5 캐릭터를 읽으면 레벨업에 필요한 경험치가 1500 이다', 레벨 && 경험치, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
