import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 봇목록, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-022',
  name: '잿빛 숲 봇 목록을 받으면 봇 레벨이 모두 9~15 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn022');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('잿빛 숲 봇 목록을 받는다', async () => {
      const 봇들 = await 봇목록(request, 누구!, 'Intermediate');
      const 있다 = await verify('잿빛 숲 봇이 한 명 이상 있다', 봇들.length > 0, true);
      const 가장낮은 = Math.min(...봇들.map((b) => b.level));
      const 가장높은 = Math.max(...봇들.map((b) => b.level));
      const 아래 = await verify('가장 낮은 봇 레벨이 9 이상이다', 가장낮은 >= 9, true);
      const 위 = await verify('가장 높은 봇 레벨이 15 이하다', 가장높은 <= 15, true);
      await verify('잿빛 숲 봇 목록을 받으면 봇 레벨이 모두 9~15 다', 있다 && 아래 && 위, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
