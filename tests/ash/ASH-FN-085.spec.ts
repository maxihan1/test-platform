import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 몬스터처치, 새캐릭터, 스폰하나, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-085',
  name: '임프를 처치해도 가방의 아이템 수가 그대로다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa085');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('임프 처치를 보고하고 가방을 읽는다', async () => {
      const 전 = (await 가방(admin, 나!)).items.length;
      const 응답 = await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Beginner', 'Imp'));
      await verify('임프 처치 응답 코드가 200 이다', 응답.status(), 200);
      const 후 = (await 가방(admin, 나!)).items.length;
      await verify('임프를 처치해도 가방의 아이템 수가 그대로다', 후, 전);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
