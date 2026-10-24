import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-349',
  name: '있는 캐릭터를 읽으면 200 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa349');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('내 캐릭터를 읽는다', async () => {
      await verify('있는 캐릭터를 읽으면 200 이다', (await 내캐릭터읽기(admin, 나!)).status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
