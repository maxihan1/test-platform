import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 성향바꾸기시도 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-213',
  name: '성향치를 1001 로 바꾸려 하면 성향치가 1000 을 넘지 않는다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa213');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('성향치를 1001 로 바꾼다', async () => {
      await 성향바꾸기시도(admin, 나!, 1001);
      await verify('성향치를 1001 로 바꾸려 하면 성향치가 1000 을 넘지 않는다', (await 캐릭터읽기(admin, 나!)).alignment.value <= 1000, true);
    });

    await test.step('성향치를 −1001 로 바꾼다', async () => {
      await 성향바꾸기시도(admin, 나!, -1001);
      await verify('성향치를 −1001 로 바꾸려 하면 성향치가 −1000 아래로 내려가지 않는다', (await 캐릭터읽기(admin, 나!)).alignment.value >= -1000, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
