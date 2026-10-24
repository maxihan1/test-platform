import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇처치, 새캐릭터, 순간이동, 캐릭터읽기, type 봇정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 살아있는봇 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-448',
  name: '살아 있는 봇을 처치하면 200 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇: 봇정보 | undefined;
  try {
    await test.step('초록 들판에 새 캐릭터를 두고 살아 있는 봇을 고른다', async () => {
      나 = await 새캐릭터(admin, 'zqa448');
      await 순간이동(admin, 나, 'Beginner');
      봇 = await 살아있는봇(admin, 나, 'Beginner');
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('살아 있는 봇을 처치한다', async () => {
      const 응답 = await 봇처치(admin, 나!, 봇!.id);
      await verify('살아 있는 봇을 처치하면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
