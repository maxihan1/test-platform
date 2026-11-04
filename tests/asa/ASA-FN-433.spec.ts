import { defineCase, test, verify } from '@platform/kit';

import { 새스폰번호, 스폰고치기, 스폰있나, 스폰지우기, 어드민부르기 } from './helpers/admin.helper.js';
import { 값읽기, 사냥터좌표 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-433',
  name: '스폰 표를 초기화하면 「count」가 49 다',
  apiDoc: 1,
  precondition: ['기본 표에 없는 스폰을 하나 더한 스폰 표다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 번호 = 새스폰번호();
  const 들판 = 사냥터좌표.Beginner;

  await test.step('기본 표에 없는 스폰을 하나 더한다', async () => {
    await 스폰고치기(admin, 번호, {
      zone: 'Beginner',
      monster: 'Imp',
      x: 들판.x,
      z: 들판.z,
    });
  });

  try {
    await test.step('더한 스폰이 스폰 목록에 있는지 확인한다', async () => {
      await verify('스폰 목록에 더한 스폰이 있다', await 스폰있나(admin, 번호), true, { blocker: true });
    });

    await test.step('스폰 표를 초기화한다', async () => {
      const 값 = await 값읽기<{ count?: number }>(await 어드민부르기(admin, 'POST', '/admin/spawns/reset'));
      await verify('스폰 표를 초기화하면 「count」가 49 다', 값.count, 49);
      await verify('초기화하면 더한 스폰이 스폰 목록에서 사라진다', await 스폰있나(admin, 번호), false);
    });
  } finally {
    if (await 스폰있나(admin, 번호)) await 스폰지우기(admin, 번호);
  }
});
