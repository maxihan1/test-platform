import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 스폰표받기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-010',
  name: '스폰 표를 받으면 초록 들판의 임프 스폰이 24곳이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn010');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('몬스터 스폰 표를 받는다', async () => {
      const 표 = await 스폰표받기(request, 누구!);
      const 임프 = 표.filter((s) => s.zone === 'Beginner' && s.monster === 'Imp').length;
      await verify('스폰 표를 받으면 초록 들판의 임프 스폰이 24곳이다', 임프, 24);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
