import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터, type 캐릭터정보 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기, 빠진키 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-415',
  name: '캐릭터를 번호로 읽으면 id · name · level · exp · expToNext · gold · position · zone 이 있다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa415');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('내 캐릭터를 번호로 읽는다', async () => {
      const 응답 = await 내캐릭터읽기(admin, 나!);
      const 코드 = await verify('캐릭터 읽기 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<캐릭터정보>(응답);
      const 칸 = await verify('캐릭터 읽기 응답에 빠진 칸이 없다', 빠진키(몸, ['id', 'name', 'level', 'exp', 'expToNext', 'gold', 'position', 'zone']), '');
      await verify('캐릭터를 번호로 읽으면 id · name · level · exp · expToNext · gold · position · zone 이 있다', 코드 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
