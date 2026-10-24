import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 새캐릭터, 스폰하나, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

interface 처치몸 {
  goldGained: number;
  expGained: number;
}

export const spec = defineCase({
  tcId: 'ASH-FN-073',
  name: '몬스터마다 처치를 보고하면 얻은 경험치가 몬스터 표 값이고 골드가 표의 범위 안이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['monster:Imp', 'monster:VandalImp', 'monster:ImpBoss', 'flow:골드-몬스터처치'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa073');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('몬스터 종류마다 그 스폰 자리에서 처치를 보고한다', async () => {
      const 임프 = await 응답몸<처치몸>(await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Beginner', 'Imp')));
      const 반달 = await 응답몸<처치몸>(await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Intermediate', 'VandalImp')));
      const 군주 = await 응답몸<처치몸>(await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Boss', 'ImpBoss')));

      const 임프경험치 = await verify.element('임프를 처치하면 얻은 경험치가 몬스터 표 값이다', 'monster:Imp', 임프.expGained, 20);
      const 반달경험치 = await verify.element('반달 임프를 처치하면 얻은 경험치가 몬스터 표 값이다', 'monster:VandalImp', 반달.expGained, 90);
      const 군주경험치 = await verify.element('임프 군주를 처치하면 얻은 경험치가 몬스터 표 값이다', 'monster:ImpBoss', 군주.expGained, 2000);
      const 임프골드 = await verify('임프를 처치하면 얻은 골드가 8 이상 15 이하다', 임프.goldGained >= 8 && 임프.goldGained <= 15, true);
      const 반달골드 = await verify('반달 임프를 처치하면 얻은 골드가 30 이상 55 이하다', 반달.goldGained >= 30 && 반달.goldGained <= 55, true);
      const 군주골드 = await verify('임프 군주를 처치하면 얻은 골드가 800 이상 1200 이하다', 군주.goldGained >= 800 && 군주.goldGained <= 1200, true);

      await verify(
        '몬스터마다 처치를 보고하면 얻은 경험치가 몬스터 표 값이고 골드가 표의 범위 안이다',
        임프경험치 && 반달경험치 && 군주경험치 && 임프골드 && 반달골드 && 군주골드,
        true,
      );
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
