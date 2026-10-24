import { defineCase, test, verify } from '@platform/kit';

import { 결과고정읽기 } from './helpers/admin.helper.js';
import { 결과고정, 결과고정비우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-544',
  name: '결과를 고정하면 고정 목록에 대기 중인 결과로 보인다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다', '결과가 고정돼 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('이전 실행이 남긴 고정 결과를 비운다', async () => {
      await 결과고정비우기(admin);
    });
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('결과를 고정하고 고정 목록을 받는다', async () => {
      await 결과고정(admin, { enhance: ['Fail', 'Success'] });
      await verify('결과를 고정하면 고정 목록에 대기 중인 결과로 보인다', (await 결과고정읽기(admin)).enhance.join(', '), 'Fail, Success');
    });
    await test.step('고정된 결과가 남아 있는지 확인한다', async () => {
      await verify('결과가 고정돼 있다', (await 결과고정읽기(admin)).enhance.length > 0, true, { blocker: true });
    });
    await test.step('고정 목록을 비운다', async () => {
      await 결과고정비우기(admin);
      const 남은 = await 결과고정읽기(admin);
      await verify('고정 목록을 DELETE 로 비우면 대기 중인 결과가 없어진다', 남은.enhance.length + 남은.botLoot.length + 남은.deathDrop.length, 0);
    });
  } finally {
    await 결과고정비우기(admin);
  }
});
