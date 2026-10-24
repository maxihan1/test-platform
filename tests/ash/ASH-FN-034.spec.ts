import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-034',
  name: '마을 범위이면서 Z < 200 인 (160, 10) 으로 옮기면 구역이 「Town」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'zone:Boss'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn034');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('캐릭터를 (160, 10) 으로 옮기고 캐릭터 정보를 받는다', async () => {
      const 나 = 누구!;
      await 순간이동(admin, 나, { x: 160, z: 10 });
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('마을 범위이면서 Z < 200 인 (160, 10) 으로 옮기면 구역이 「Town」이다', 정보.zone, 'Town');
    });
    await test.step('캐릭터를 (140, 330) 으로 옮기고 캐릭터 정보를 받는다', async () => {
      const 나 = 누구!;
      await 순간이동(admin, 나, { x: 140, z: 330 });
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('보스 범위이면서 Z 200 이상인 (140, 330) 으로 옮기면 구역이 「Boss」다', 정보.zone, 'Boss');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
