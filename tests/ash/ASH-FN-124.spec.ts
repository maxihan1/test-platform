import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-124',
  name: '새 캐릭터의 가방을 받으면 칸 수가 40 이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn124');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('가방을 받는다', async () => {
      await verify('새 캐릭터의 가방을 받으면 칸 수가 40 이다', (await 가방받기(request, 누구!)).capacity, 40);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
