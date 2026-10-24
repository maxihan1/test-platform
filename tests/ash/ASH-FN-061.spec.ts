import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 순간이동, 스폰하나, 몬스터처치, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 필요경험치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-061',
  name: '레벨 50 캐릭터가 임프를 처치해 경험치가 차도 레벨이 50 이다',
  platforms: ['android'],
  precondition: ['레벨 50 이고 경험치가 다음 레벨 필요량 바로 아래인 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('레벨 50 이고 경험치가 다음 레벨 필요량 바로 아래인 새 캐릭터를 초록 들판에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa061');
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { level: 50 });
      await 바꾸기(admin, 나, { exp: 필요경험치(50) - 1 });
    });

    await test.step('새 캐릭터가 레벨 50 으로 초록 들판에 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 레벨 = await verify('캐릭터 레벨이 50 이다', 읽음.level, 50, { blocker: true });
      const 경험치 = await verify('캐릭터 경험치가 다음 레벨 필요량 바로 아래다', 읽음.exp, 필요경험치(50) - 1, { blocker: true });
      const 구역 = await verify('캐릭터가 초록 들판에 있다', 읽음.zone, 'Beginner', { blocker: true });
      await verify('레벨 50 이고 경험치가 다음 레벨 필요량 바로 아래인 새 캐릭터가 초록 들판에 있다', 레벨 && 경험치 && 구역, true, { blocker: true });
    });

    await test.step('임프를 처치한다', async () => {
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      const 응답 = await 몬스터처치(admin, 나!, 스폰);
      await verify('임프 처치 응답 코드가 200 이다', 응답.status(), 200);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('레벨 50 캐릭터가 임프를 처치해 경험치가 차도 레벨이 50 이다', 읽음.level, 50);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
