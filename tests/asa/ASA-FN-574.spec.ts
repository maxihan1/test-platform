import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-574',
  name: '어드민 아이템 목록을 부르면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 아이템 목록을 부른다', async () => {
    const 응답 = await 어드민부르기(admin, 'GET', '/admin/item-templates');
    await verify('어드민 아이템 목록을 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
