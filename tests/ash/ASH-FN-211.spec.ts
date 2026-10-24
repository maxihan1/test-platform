import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-211',
  name: '성향치를 1000 · −1000 으로 바꾸면 그 값이 그대로 남는다',
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
      나 = await 새캐릭터(admin, 'zqa211');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('성향치를 1000 과 −1000 으로 바꾼다', async () => {
      await 바꾸기(admin, 나!, { alignment: 1000 });
      const 위 = await verify('성향치가 1000 으로 남는다', (await 캐릭터읽기(admin, 나!)).alignment.value, 1000);
      await 바꾸기(admin, 나!, { alignment: -1000 });
      const 아래 = await verify('성향치가 −1000 으로 남는다', (await 캐릭터읽기(admin, 나!)).alignment.value, -1000);
      await verify('성향치를 1000 · −1000 으로 바꾸면 그 값이 그대로 남는다', 위 && 아래, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
