import { defineCase, test, verify } from '@platform/kit';

import { type 스폰, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-076',
  name: '임프 처치를 보고하면 받는 골드가 8~15 안이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  elements: ['flow:골드-몬스터처치', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰값: 스폰 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn076');
      스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 처치를 보고한다', async () => {
      const 결과 = await 몬스터처치(request, 누구!, 스폰값!);
      const 아래 = await verify('받는 골드가 8 이상이다', 결과.goldGained >= 8, true);
      const 위 = await verify('받는 골드가 15 이하다', 결과.goldGained <= 15, true);
      await verify('임프 처치를 보고하면 받는 골드가 8~15 안이다', 아래 && 위, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
