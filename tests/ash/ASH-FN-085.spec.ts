import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 스폰, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-085',
  name: '임프를 처치해도 가방의 아이템 수가 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  elements: ['monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰값: 스폰 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn085');
      스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 처치를 보고하고 가방을 받는다', async () => {
      const 나 = 누구!;
      const 이전 = (await 가방받기(request, 나)).items.length;
      await 몬스터처치(request, 나, 스폰값!);
      const 이후 = (await 가방받기(request, 나)).items.length;
      await verify('임프를 처치해도 가방의 아이템 수가 그대로다', 이후, 이전);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
