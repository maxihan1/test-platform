import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-220',
  name: '성향치를 −1 로 바꾸면 상태가 「Chaotic」이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Town', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa220');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('성향치를 −1 로 바꾼다', async () => {
      await 바꾸기(admin, 나!, { alignment: -1 });
      await verify('성향치를 −1 로 바꾸면 상태가 「Chaotic」이다', (await 캐릭터읽기(admin, 나!)).alignment.state, 'Chaotic');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
