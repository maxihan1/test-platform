import { defineCase, test, verify } from '@platform/kit';

import { 새스폰번호, 스폰고치기, 스폰있나, 스폰지우기 } from './helpers/admin.helper.js';
import { 마을좌표 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-432',
  name: '마을에 스폰을 두면 받아들여지지 않는다',
  apiDoc: 1,
  precondition: ['스폰 표에 없는 새 스폰 번호다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 번호 = '';

  await test.step('새 스폰 번호를 짓는다', async () => {
    번호 = 새스폰번호();
  });

  await test.step('새 스폰 번호가 스폰 표에 없는지 확인한다', async () => {
    await verify('스폰 목록에 새 번호가 없다', await 스폰있나(admin, 번호), false, { blocker: true });
  });

  try {
    await test.step('새 번호로 하늘빛 마을에 임프 스폰을 둔다', async () => {
      const 응답 = await 스폰고치기(admin, 번호, {
        zone: 'Town',
        monster: 'Imp',
        x: 마을좌표.x,
        z: 마을좌표.z,
      });
      await verify('마을에 스폰을 두면 받아들여지지 않는다', 응답.ok(), false);
      await verify('마을에 두려던 번호가 스폰 목록에 없다', await 스폰있나(admin, 번호), false);
    });
  } finally {
    if (await 스폰있나(admin, 번호)) await 스폰지우기(admin, 번호);
  }
});
