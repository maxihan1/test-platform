import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 목록칸들 } from './helpers/admin.helper.js';
import { 스폰목록 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-571',
  name: '어드민 스폰 표를 받으면 SpawnPointDto 목록이 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
  });
  await test.step('어드민 스폰 표를 받는다', async () => {
    const 표 = await 스폰목록(admin);
    const 있음 = await verify('스폰 표에 스폰이 있다', 표.length > 0, true);
    const 칸 = await verify('스폰마다 id · zone · monster · x · z 가 온다', 목록칸들(표), 목록글('id', 'zone', 'monster', 'x', 'z'));
    await verify('어드민 스폰 표를 받으면 SpawnPointDto 목록이 온다', 있음 && 칸, true);
  });
});
