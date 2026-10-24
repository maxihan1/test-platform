import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-001',
  name: 'X 200, Z 40 으로 옮기면 캐릭터 구역이 「Town」이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa001');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('캐릭터를 X 200, Z 40 으로 옮긴다', async () => {
      await 바꾸기(admin, 나!, { x: 200, z: 40 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 가로 = await verify('캐릭터 위치 X 가 200 이다', 읽음.position.x, 200);
      const 세로 = await verify('캐릭터 위치 Z 가 40 이다', 읽음.position.z, 40);
      const 구역 = await verify('캐릭터 구역이 「Town」이다', 읽음.zone, 'Town');
      await verify('X 200, Z 40 으로 옮기면 캐릭터 구역이 「Town」이다', 가로 && 세로 && 구역, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
