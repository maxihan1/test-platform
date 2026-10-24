import { defineCase, test, verify } from '@platform/kit';

import { 스폰지우기 } from './helpers/admin.helper.js';
import { 스폰되돌리기, 스폰목록 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-580',
  name: '스폰을 지우면 남은 스폰 수 48 이 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('스폰 하나를 지운다', async () => {
      const 첫째 = (await 스폰목록(admin))[0];
      if (첫째 === undefined) throw new Error('스폰 표가 비어 있다');
      const 남은 = await 스폰지우기(admin, 첫째.id);
      await verify('스폰을 지우면 남은 스폰 수 48 이 온다', 남은.count, 48);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
