import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-601',
  name: '어드민 강화 설정에 빈 요청을 보내면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 강화 설정에 빈 요청을 보낸다', async () => {
    const 응답 = await 어드민부르기(admin, 'PUT', '/admin/config/enhance-rates', {});
    await verify('어드민 강화 설정에 빈 요청을 보내면 200 이 돌아온다', 응답.status(), 200);
  });
});
