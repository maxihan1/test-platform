import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM레벨 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-475',
  name: 'GM 레벨 10 을 주면 캐릭터 레벨이 10 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa475');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('GM 레벨 10 을 준다', async () => {
      const 응답 = await GM레벨(admin, 나!, 10);
      const 코드 = await verify('GM 레벨 응답이 200 이다', 응답.status(), 200);
      const 레벨 = await verify('캐릭터 레벨이 10 이다', (await 캐릭터읽기(admin, 나!)).level, 10);
      await verify('GM 레벨 10 을 주면 캐릭터 레벨이 10 이다', 코드 && 레벨, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
