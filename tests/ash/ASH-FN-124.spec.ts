import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-124',
  name: '새 캐릭터 가방을 읽으면 칸 수가 40 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa124');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('가방을 읽는다', async () => {
      await verify('새 캐릭터 가방을 읽으면 칸 수가 40 이다', (await 가방(admin, 나!)).capacity, 40);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
