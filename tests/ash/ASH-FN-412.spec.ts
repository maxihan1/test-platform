import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터목록, 캐릭터만들기응답, 캐릭터지우기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-412',
  name: '지운 캐릭터와 같은 이름으로 다시 만들면 201 이다',
  platforms: ['android'],
  precondition: ['캐릭터 하나를 가진 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('캐릭터 하나를 가진 새 계정을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa412');
    });

    await test.step('내 캐릭터 목록에 새 캐릭터가 있는지 확인한다', async () => {
      const 목록 = await 내캐릭터목록(admin, 나!);
      await verify('내 캐릭터 목록에 새 캐릭터가 있다', 목록.some((x) => x.id === 나!.id), true, { blocker: true });
    });

    await test.step('캐릭터를 지우고 같은 이름으로 다시 만든다', async () => {
      const 지움 = await 캐릭터지우기응답(admin, 나!);
      await verify('캐릭터 삭제 응답이 204 다', 지움.status(), 204);
      const 다시 = await 캐릭터만들기응답(admin, 나!, 나!.이름);
      await verify('지운 캐릭터와 같은 이름으로 다시 만들면 201 이다', 다시.status(), 201);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
