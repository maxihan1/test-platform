import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 새캐릭터, 스폰하나, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-088',
  name: '임프를 처치하면 응답에 goldGained · expGained · leveledUp · character 가 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  smoke: true,
  elements: ['monster:Imp', 'flow:골드-몬스터처치'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa088');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('임프 처치를 보고한다', async () => {
      const 응답 = await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Beginner', 'Imp'));
      await verify('임프 처치 응답 코드가 200 이다', 응답.status(), 200);
      const 칸들 = Object.keys(await 응답몸<Record<string, unknown>>(응답));
      const 골드 = await verify('응답에 goldGained 가 있다', 칸들.includes('goldGained'), true);
      const 경험치 = await verify('응답에 expGained 가 있다', 칸들.includes('expGained'), true);
      const 레벨업 = await verify('응답에 leveledUp 이 있다', 칸들.includes('leveledUp'), true);
      const 캐릭 = await verify('응답에 character 가 있다', 칸들.includes('character'), true);
      await verify('임프를 처치하면 응답에 goldGained · expGained · leveledUp · character 가 있다', 골드 && 경험치 && 레벨업 && 캐릭, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
