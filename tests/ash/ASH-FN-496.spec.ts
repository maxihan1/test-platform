import { defineCase, test, verify } from '@platform/kit';

import { 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-496',
  name: '어드민 키로 어드민 설정을 부르면 200 이다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
  });

  await test.step('어드민 키로 어드민 설정을 부른다', async () => {
    const 응답 = await admin.get('/admin/config');
    await verify('어드민 키로 어드민 설정을 부르면 200 이다', 응답.status(), 200);
  });
});
