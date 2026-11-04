import { defineCase, test, verify } from '@platform/kit';

import { 새스폰번호, 스폰고치기, 스폰목록, 스폰있나, 스폰지우기 } from './helpers/admin.helper.js';
import { 사냥터좌표 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-427',
  name: '없는 번호로 스폰을 고치면 스폰 목록에 그 번호가 생긴다',
  apiDoc: 1,
  precondition: ['스폰 표에 없는 새 스폰 번호다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 번호 = '';
  const 들판 = 사냥터좌표.Beginner;

  await test.step('새 스폰 번호를 짓는다', async () => {
    번호 = 새스폰번호();
  });

  await test.step('새 스폰 번호가 스폰 표에 없는지 확인한다', async () => {
    await verify('스폰 목록에 새 번호가 없다', await 스폰있나(admin, 번호), false, { blocker: true });
  });

  try {
    await test.step('없는 번호로 초록 들판 임프 스폰을 고친다', async () => {
      await 스폰고치기(admin, 번호, {
        zone: 'Beginner',
        monster: 'Imp',
        x: 들판.x,
        z: 들판.z,
      });
      await verify('없는 번호로 스폰을 고치면 스폰 목록에 그 번호가 생긴다', await 스폰있나(admin, 번호), true);
    });

    await test.step('같은 번호로 좌표를 바꿔 다시 고친다', async () => {
      await 스폰고치기(admin, 번호, {
        zone: 'Beginner',
        monster: 'Imp',
        x: 들판.x + 20,
        z: 들판.z,
      });
      const 찾은것 = (await 스폰목록(admin)).find((s) => s.id === 번호);
      await verify('있는 번호로 다시 고치면 스폰 목록의 그 번호 좌표가 바뀐다', 찾은것?.x, 들판.x + 20);
    });
  } finally {
    await 스폰지우기(admin, 번호);
  }
});
