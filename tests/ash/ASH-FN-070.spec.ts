import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 사망보고, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-070',
  name: '초록 들판에서 사망하면 캐릭터가 마을 (200, 30) 에 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'zone:Town', 'respawn:마을', 'move:생존 죽음→마을'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa070');
      await 순간이동(admin, 나, 'Beginner');
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 응답 = await 사망보고(admin, 나!);
      await verify('사망 보고 응답 코드가 200 이다', 응답.status(), 200);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 가로 = await verify('캐릭터 위치 X 가 200 이다', 읽음.position.x, 200);
      const 세로 = await verify('캐릭터 위치 Z 가 30 이다', 읽음.position.z, 30);
      await verify('초록 들판에서 사망하면 캐릭터가 마을 (200, 30) 에 있다', 가로 && 세로, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
