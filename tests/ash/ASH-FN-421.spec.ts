import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 가방정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내가방읽기, 빠진키 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-421',
  name: '가방을 부르면 capacity · used · gold · items 가 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa421');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('가방을 부른다', async () => {
      const 응답 = await 내가방읽기(admin, 나!);
      const 코드 = await verify('가방 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<가방정보>(응답);
      const 칸 = await verify('가방 응답에 빠진 칸이 없다', 빠진키(몸, ['capacity', 'used', 'gold', 'items']), '');
      await verify('가방을 부르면 capacity · used · gold · items 가 있다', 코드 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
