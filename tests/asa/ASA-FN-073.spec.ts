import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-073',
  name: '플레이어 토큰 없이 어드민 키로 GET /admin/config 를 부르면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['플레이어 토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('플레이어 토큰 없이 어드민 키로 GET /admin/config 를 부른다', async () => {
    const 응답 = await 어드민부르기(admin, 'GET', '/admin/config');
    await verify('플레이어 토큰 없이 어드민 키로 GET /admin/config 를 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
