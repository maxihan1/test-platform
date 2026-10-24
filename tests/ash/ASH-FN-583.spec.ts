import { defineCase, test, verify } from '@platform/kit';

import { 스폰지우기 } from './helpers/admin.helper.js';
import { 스폰되돌리기, 스폰목록 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-583',
  name: '스폰 표를 되돌리면 기본 표 49곳이 된다',
  platforms: ['android'],
  precondition: ['스폰 하나가 지워져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('스폰 하나를 지워 둔다', async () => {
      const 첫째 = (await 스폰목록(admin))[0];
      if (첫째 === undefined) throw new Error('스폰 표가 비어 있다');
      await 스폰지우기(admin, 첫째.id);
    });
    await test.step('지운 스폰을 확인한다', async () => {
      await verify('스폰 하나가 지워져 있다', (await 스폰목록(admin)).length, 48, { blocker: true });
    });
    await test.step('스폰 표를 되돌린다', async () => {
      await 스폰되돌리기(admin);
      await verify('스폰 표를 되돌리면 기본 표 49곳이 된다', (await 스폰목록(admin)).length, 49);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
