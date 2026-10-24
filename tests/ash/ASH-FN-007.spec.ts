import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-007',
  name: '마을 밖 X 100, Z 150 으로 옮기면 캐릭터 구역이 「Beginner」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa007');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('캐릭터를 X 100, Z 150 으로 옮긴다', async () => {
      await 순간이동(admin, 나!, { x: 100, z: 150 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('마을 밖 X 100, Z 150 으로 옮기면 캐릭터 구역이 「Beginner」다', 읽음.zone, 'Beginner');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
