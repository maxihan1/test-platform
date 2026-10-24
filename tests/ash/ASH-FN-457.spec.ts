import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 빠진줄, 스폰표읽기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-457',
  name: '스폰 표를 부르면 스폰마다 id · zone · monster · x · z 가 있다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa457');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('몬스터 스폰 표를 부른다', async () => {
      const 응답 = await 스폰표읽기응답(admin, 나!);
      const 코드 = await verify('스폰 표 응답이 200 이다', 응답.status(), 200);
      const 표 = await 응답몸<object[]>(응답);
      const 있음 = await verify('스폰이 한 곳 이상 있다', 표.length > 0, true);
      const 칸 = await verify('빠진 칸이 있는 스폰이 없다', 빠진줄(표, ['id', 'zone', 'monster', 'x', 'z']), '');
      await verify('스폰 표를 부르면 스폰마다 id · zone · monster · x · z 가 있다', 코드 && 있음 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
