import { defineCase, test, verify } from '@platform/kit';

import { 스폰바꾸기 } from './helpers/admin.helper.js';
import { 스폰되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-579',
  name: '마을 구역으로 스폰을 PUT 하면 받아들여지지 않는다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('마을 구역으로 스폰을 PUT 한다', async () => {
      const 응답 = await 스폰바꾸기(admin, 'qafn579', { zone: 'Town', monster: 'Imp', x: 200, z: 30 });
      await verify('마을 구역으로 스폰을 PUT 하면 받아들여지지 않는다', 응답.ok(), false);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
