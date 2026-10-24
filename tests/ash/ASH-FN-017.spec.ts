import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-017',
  name: '캐릭터를 Z 199 인 (60, 199) 로 옮기면 구역이 「Beginner」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn017');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('캐릭터를 (60, 199) 로 옮기고 캐릭터 정보를 받는다', async () => {
      const 나 = 누구!;
      await 순간이동(admin, 나, { x: 60, z: 199 });
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('캐릭터를 Z 199 인 (60, 199) 로 옮기면 구역이 「Beginner」다', 정보.zone, 'Beginner');
    });
    await test.step('캐릭터를 (60, 200) 으로 옮기고 캐릭터 정보를 받는다', async () => {
      const 나 = 누구!;
      await 순간이동(admin, 나, { x: 60, z: 200 });
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('캐릭터를 Z 200 인 (60, 200) 으로 옮기면 구역이 「Intermediate」다', 정보.zone, 'Intermediate');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
