import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터, type 캐릭터정보 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기, 위치저장응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-418',
  name: '위치를 저장하면 204 이고 다시 읽은 위치가 X 120, Z 150 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa418');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('위치를 X 120, Y 0, Z 150 으로 저장한다', async () => {
      const 응답 = await 위치저장응답(admin, 나!, { x: 120, y: 0, z: 150 });
      const 코드 = await verify('위치 저장 응답이 204 다', 응답.status(), 204);
      const 읽음 = await 응답몸<캐릭터정보>(await 내캐릭터읽기(admin, 나!));
      const 엑스 = await verify('다시 읽은 위치의 X 가 120 이다', 읽음.position.x, 120);
      const 제트 = await verify('다시 읽은 위치의 Z 가 150 이다', 읽음.position.z, 150);
      await verify('위치를 저장하면 204 이고 다시 읽은 위치가 X 120, Z 150 이다', 코드 && 엑스 && 제트, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
