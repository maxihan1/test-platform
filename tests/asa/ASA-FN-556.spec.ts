import { defineCase, test, verify } from '@platform/kit';

import { 새스폰번호, 스폰고치기, 스폰있나, 스폰지우기 } from './helpers/admin.helper.js';
import { 사냥터좌표 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-556',
  name: '만든 스폰을 지우면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['스폰 표에 없는 스폰을 하나 만들었다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 번호 = 새스폰번호();
  const 들판 = 사냥터좌표.Beginner;
  let 지웠다 = false;

  await test.step('스폰 표에 없는 번호로 초록 들판 스폰을 만든다', async () => {
    await 스폰고치기(admin, 번호, {
      zone: 'Beginner',
      monster: 'Imp',
      x: 들판.x,
      z: 들판.z,
    });
  });

  try {
    await test.step('만든 스폰이 스폰 목록에 있는지 확인한다', async () => {
      await verify('스폰 목록에 만든 스폰이 있다', await 스폰있나(admin, 번호), true, { blocker: true });
    });

    await test.step('만든 스폰을 지운다', async () => {
      const 응답 = await 스폰지우기(admin, 번호);
      지웠다 = true;
      await verify('만든 스폰을 지우면 200 이 돌아온다', 응답.status(), 200);
    });
  } finally {
    if (!지웠다) await 스폰지우기(admin, 번호);
  }
});
