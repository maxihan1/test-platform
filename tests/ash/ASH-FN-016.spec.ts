import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-016',
  name: 'X 100, Z 250 으로 옮기면 캐릭터 구역이 「Intermediate」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa016');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('캐릭터를 X 100, Z 250 으로 옮긴다', async () => {
      await 순간이동(admin, 나!, { x: 100, z: 250 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('X 100, Z 250 으로 옮기면 캐릭터 구역이 「Intermediate」다', 읽음.zone, 'Intermediate');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
