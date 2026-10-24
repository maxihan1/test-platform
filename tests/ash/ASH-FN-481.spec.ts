import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM봇다시두기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-481',
  name: 'GM 봇 다시 두기를 초급 구역으로 부르면 botCount 가 8 이다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa481');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('GM 봇 다시 두기를 초급 구역으로 부른다', async () => {
      const 응답 = await GM봇다시두기(admin, 나!, 'Beginner');
      const 코드 = await verify('GM 봇 다시 두기 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ botCount: number }>(응답);
      const 수 = await verify('botCount 가 8 이다', 몸.botCount, 8);
      await verify('GM 봇 다시 두기를 초급 구역으로 부르면 botCount 가 8 이다', 코드 && 수, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
