import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 스폰정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 임프스폰 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-238',
  name: '임프 1마리를 처치하면 성향치가 10 오른다',
  platforms: ['android'],
  precondition: ['성향치 0 인 새 캐릭터가 있다'],
  elements: ['monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 스폰: 스폰정보 | undefined;
  try {
    await test.step('성향치 0 인 새 캐릭터를 만들고 임프 스폰 자리로 옮긴다', async () => {
      나 = await 새캐릭터(admin, 'zqa238');
      await 바꾸기(admin, 나, { alignment: 0 });
      스폰 = await 임프스폰(admin);
      if (스폰 !== undefined) await 순간이동(admin, 나, { x: 스폰.x, z: 스폰.z });
    });

    await test.step('성향치가 0 이고 임프 스폰이 있는지 확인한다', async () => {
      await verify('성향치가 0 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, 0, { blocker: true });
      await verify('임프 스폰이 있다', 스폰 !== undefined, true, { blocker: true });
    });

    await test.step('임프 처치를 보고한다', async () => {
      const 코드 = await verify('처치 응답 코드가 200 이다', (await 몬스터처치(admin, 나!, 스폰!)).status(), 200);
      const 오름 = await verify('성향치가 10 오른다', (await 캐릭터읽기(admin, 나!)).alignment.value, 10);
      await verify('임프 1마리를 처치하면 성향치가 10 오른다', 코드 && 오름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
