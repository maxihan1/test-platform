import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 어드민캐릭터들 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-508',
  name: '이름으로 캐릭터를 찾으면 그 캐릭터가 나온다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa508');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('그 이름으로 캐릭터를 찾는다', async () => {
      const 목록 = await 어드민캐릭터들(admin, { name: 나!.이름 });
      await verify('이름으로 캐릭터를 찾으면 그 캐릭터가 나온다', 목록.some((x) => x.id === 나!.id), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
