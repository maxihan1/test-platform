import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 새캐릭터, 스폰하나, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-096',
  name: '임프 스폰을 반달 임프로 보고하면 409 「INVALID_SPAWN」이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['monster:Imp', 'monster:VandalImp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa096');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('임프 스폰을 반달 임프로 처치했다고 보고한다', async () => {
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      const 응답 = await 몬스터처치(admin, 나!, 스폰, { monsterId: 'VandalImp' });
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INVALID_SPAWN」이다', await 오류코드(응답), 'INVALID_SPAWN');
      await verify('임프 스폰을 반달 임프로 보고하면 409 「INVALID_SPAWN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
