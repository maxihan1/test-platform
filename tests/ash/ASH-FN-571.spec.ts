import { defineCase, test, verify } from '@platform/kit';

import { 스폰목록 } from './helpers/game-state.helper.js';
import { 빠진줄, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-571',
  name: '어드민 스폰 표에 스폰마다 id · zone · monster · x · z 가 있다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
  });

  await test.step('어드민 스폰 표를 부른다', async () => {
    const 표 = await 스폰목록(admin);
    const 있음 = await verify('스폰이 한 곳 이상 있다', 표.length > 0, true);
    const 칸 = await verify('빠진 칸이 있는 스폰이 없다', 빠진줄(표, ['id', 'zone', 'monster', 'x', 'z']), '');
    await verify('어드민 스폰 표에 스폰마다 id · zone · monster · x · z 가 있다', 있음 && 칸, true);
  });
});
